const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwtvttrbackEndChallenge', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remover senha dos resultados
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Verificar se existe email e password
  if (!email || !password) {
    return next(new AppError('Por favor, coloque email e password!', 400));
  }
  // 2) Verificae se o usuário existe && a senha está correta
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Password ou email incorretos', 401));
  }

  // 3) Se tudo estiver ok, enviar o token
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwtvttrbackEndChallenge', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Obtendo token e verificando se válido
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwtvttrbackEndChallenge) {
    token = req.cookies.jwtvttrbackEndChallenge;
  }

  if (!token) {
    return next(
      new AppError('Você não está logado! Faça login para ter acesso.', 401)
    );
  }

  // 2) Verificando o token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Verificando se usuário ainda existe
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'O usuário a quem pertence este token não existe mais.',
        401
      )
    );
  }

  // 4) Verificando se o usuário alterou password após a emissão do token
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('O usuário alterou a password recentemente! Por favor faça login novamente.', 401)
    );
  }

  // CONCEDER ACESSO À ROTA PROTEGIDA
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Apenas para páginas renderizadas, sem erros!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwtvttrbackEndChallenge) {
    try {
      // 1) verificar token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwtvttrbackEndChallenge,
        process.env.JWT_SECRET
      );

      // 2) Verificar se o usuário ainda existe
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Verificar se o usuário alterou password após a emissão do token
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // HÁ UM USUÁRIO LOGADO
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['RESTReader', 'RESTWriter']. role='RESTReader'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Você não tem permissão para realizar esta acção', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Obter usuário com base no e-mail 
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('Não há usuário com esse endereço de email.', 404));
  }

  // 2) Gerar o token de redefinição de password
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Enviar para o email do usuário
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token enviado para o email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('Ocorreu um erro ao enviar o email. Tente mais tarde!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Obter usuário com base no token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) Se o token não tiver expirado e houver usuário, definir a nova senha
  if (!user) {
    return next(new AppError('O token é inválido ou expirou', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Fazer o login do usuário, enviar o JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Obter usuário
  const user = await User.findById(req.user.id).select('+password');

  // 2) Verificar se a password atual está correta
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Sua password atual está errada.', 401));
  }

  // 3) Se estiver, actualizar password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Fazer o login do usuário, enviar o JWT
  createSendToken(user, 200, req, res);
});
