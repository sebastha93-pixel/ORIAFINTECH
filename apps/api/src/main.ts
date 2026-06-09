import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // handled by Vercel on the frontend
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:19006',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://nexo-finanzas-tech-api.vercel.app',
    'https://oriafintech.com',
    'https://www.oriafintech.com',
  ];
  app.enableCors({
    origin: (origin, cb) => {
      const allowed =
        !origin ||
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /oriafintech\.com$/.test(origin);
      cb(null, allowed);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global prefix & versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger docs
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ORIA API')
      .setDescription('Personal Financial Intelligence Platform - REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('dashboard', 'Dashboard & summaries')
      .addTag('accounts', 'Financial accounts')
      .addTag('transactions', 'Transactions & movements')
      .addTag('patrimony', 'Assets, liabilities & net worth')
      .addTag('goals', 'Financial goals')
      .addTag('ai', 'AI insights & chat')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 ORIA API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
