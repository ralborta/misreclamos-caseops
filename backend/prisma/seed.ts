import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@misreclamos.com' },
    update: {},
    create: {
      email: 'admin@misreclamos.com',
      passwordHash: adminHash,
      name: 'Admin Sistema',
      role: 'admin',
    },
  });

  // Coordinador
  const coordHash = await bcrypt.hash('Coord123!', 12);
  const coordinador = await prisma.user.upsert({
    where: { email: 'cmendez@misreclamos.com' },
    update: {},
    create: {
      email: 'cmendez@misreclamos.com',
      passwordHash: coordHash,
      name: 'Lic. Carolina Méndez',
      role: 'coordinador',
    },
  });

  // Abogados
  const abogadoHash = await bcrypt.hash('Abogado123!', 12);
  const rios = await prisma.user.upsert({
    where: { email: 'mrios@misreclamos.com' },
    update: {},
    create: { email: 'mrios@misreclamos.com', passwordHash: abogadoHash, name: 'Dr. Martín Ríos', role: 'abogado_interno' },
  });
  const sousa = await prisma.user.upsert({
    where: { email: 'vsousa@misreclamos.com' },
    update: {},
    create: { email: 'vsousa@misreclamos.com', passwordHash: abogadoHash, name: 'Dra. Valeria Sousa', role: 'abogado_interno' },
  });
  const pereyra = await prisma.user.upsert({
    where: { email: 'spereyra@misreclamos.com' },
    update: {},
    create: { email: 'spereyra@misreclamos.com', passwordHash: abogadoHash, name: 'Dr. Santiago Pereyra', role: 'abogado_asociado' },
  });

  // Sample cases
  const client1 = await prisma.client.create({
    data: { name: 'Roberto García', dni: '28.451.892', phone: '+54 11 4521-8870', email: 'rgarcia@gmail.com', address: 'Av. Rivadavia 4521', city: 'CABA', province: 'Buenos Aires', consent: true },
  });
  const case1 = await prisma.case.create({
    data: {
      caseId: 'MR-2024-00341',
      title: 'Despido sin causa — García vs. Logística Norte S.A.',
      materia: 'laboral',
      subtype: 'Despido incausado',
      status: 'en_gestion',
      stage: 'Intercambio telegráfico',
      priority: 'alta',
      channel: 'web',
      isUrgent: true,
      summary: 'Cliente despedido sin causa luego de 7 años en la empresa. Intercambio telegráfico en curso.',
      nextAction: 'Envío TCL de respuesta',
      nextActionDate: new Date('2024-12-22'),
      clientId: client1.id,
      assignedLawyerId: rios.id,
      coordinatorId: coordinador.id,
    },
  });

  await prisma.timelineEvent.create({
    data: { caseId: case1.id, userId: admin.id, action: 'Expediente MR-2024-00341 creado', type: 'creacion' },
  });
  await prisma.timelineEvent.create({
    data: { caseId: case1.id, userId: coordinador.id, action: 'Caso asignado a Dr. Martín Ríos', type: 'asignacion' },
  });
  await prisma.task.create({
    data: { caseId: case1.id, title: 'Enviar TCL de respuesta al despido', dueDate: new Date('2024-12-22'), priority: 'urgente', assignedToId: rios.id },
  });

  const client2 = await prisma.client.create({
    data: { name: 'María Elena Fernández', dni: '18.220.445', phone: '+54 11 5538-2201', email: 'mfernandez@hotmail.com', city: 'CABA', province: 'Buenos Aires', consent: true },
  });
  await prisma.case.create({
    data: {
      caseId: 'MR-2024-00287',
      title: 'Amparo salud — cobertura oncológica OSDE',
      materia: 'salud',
      subtype: 'Amparo de salud',
      status: 'judicializado',
      stage: 'Medida cautelar',
      priority: 'urgente',
      isUrgent: true,
      channel: 'whatsapp',
      summary: 'Paciente oncológica a quien OSDE denegó cobertura. Cautelar otorgada por Juzgado N°12.',
      clientId: client2.id,
      assignedLawyerId: sousa.id,
      coordinatorId: coordinador.id,
    },
  });

  console.log('✅ Seed completed');
  console.log('📋 Credentials:');
  console.log('   Admin:       admin@misreclamos.com / Admin123!');
  console.log('   Coordinador: cmendez@misreclamos.com / Coord123!');
  console.log('   Abogados:    *@misreclamos.com / Abogado123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
