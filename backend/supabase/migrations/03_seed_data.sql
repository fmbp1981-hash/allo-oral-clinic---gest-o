-- Seed Data para ClinicaFlow
-- Dados de teste para desenvolvimento e demonstração
-- Data: 02/12/2025

-- =====================================================
-- 1. LIMPAR DADOS EXISTENTES (Apenas para ambiente de desenvolvimento)
-- =====================================================

-- CUIDADO: Comentar essas linhas em produção!
-- DELETE FROM notifications;
-- DELETE FROM opportunities;
-- DELETE FROM patients;
-- DELETE FROM users;

-- =====================================================
-- 2. USUÁRIOS DE TESTE
-- =====================================================

INSERT INTO users (id, name, email, password_hash, clinic_name, role, created_at) VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Dr. João Silva',
    'admin@allooral.com',
    '$2a$10$YourHashedPasswordHere',  -- admin123 (usar bcrypt para gerar hash real)
    'Allo Oral Clinic - Matriz',
    'admin',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Dra. Maria Santos',
    'dentista@allooral.com',
    '$2a$10$YourHashedPasswordHere',  -- dentista123
    'Allo Oral Clinic - Filial Centro',
    'dentist',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'Ana Receptionist',
    'recepcao@allooral.com',
    '$2a$10$YourHashedPasswordHere',  -- recepcao123
    'Allo Oral Clinic - Matriz',
    'receptionist',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. PACIENTES DA BASE (50 exemplos)
-- =====================================================

INSERT INTO patients (id, name, phone, email, last_visit, clinical_records, history_array, created_at) VALUES
  -- Pacientes com histórico de implantes
  (gen_random_uuid(), 'Carlos Alberto Mendes', '(11) 98765-4321', 'carlos.mendes@email.com', '2023-06-15',
   'Paciente apresentou boa osseointegração no implante anterior. Recomendado acompanhamento semestral.',
   ARRAY['implante', 'limpeza', 'radiografia']::text[], NOW()),

  (gen_random_uuid(), 'Fernanda Costa Lima', '(11) 97654-3210', 'fernanda.lima@email.com', '2023-08-22',
   'Realizou implante unitário no dente 36. Evolução satisfatória. Interessada em clareamento.',
   ARRAY['implante', 'clareamento']::text[], NOW()),

  (gen_random_uuid(), 'Ricardo Almeida', '(11) 96543-2109', 'ricardo.almeida@email.com', '2023-04-10',
   'Procedimento de enxerto ósseo realizado. Aguardando 6 meses para implante definitivo.',
   ARRAY['implante', 'enxerto', 'radiografia']::text[], NOW()),

  -- Pacientes com histórico de ortodontia
  (gen_random_uuid(), 'Juliana Ribeiro', '(11) 95432-1098', 'juliana.ribeiro@email.com', '2024-01-15',
   'Finalizou tratamento ortodôntico. Interessada em manutenção preventiva.',
   ARRAY['ortodontia', 'limpeza', 'molde']::text[], NOW()),

  (gen_random_uuid(), 'Pedro Henrique Souza', '(11) 94321-0987', 'pedro.souza@email.com', '2023-11-20',
   'Em tratamento ortodôntico. Próxima consulta para ajuste do aparelho.',
   ARRAY['ortodontia', 'radiografia']::text[], NOW()),

  (gen_random_uuid(), 'Beatriz Oliveira', '(11) 93210-9876', 'beatriz.oliveira@email.com', '2023-09-08',
   'Solicitou avaliação para tratamento ortodôntico. Enviado orçamento.',
   ARRAY['ortodontia', 'consulta']::text[], NOW()),

  -- Pacientes com histórico de clareamento
  (gen_random_uuid(), 'Marcos Vinícius Santos', '(11) 92109-8765', 'marcos.santos@email.com', '2024-02-10',
   'Realizou clareamento dental a laser. Resultado excelente. Orientado sobre cuidados pós-tratamento.',
   ARRAY['clareamento', 'limpeza']::text[], NOW()),

  (gen_random_uuid(), 'Camila Ferreira', '(11) 91098-7654', 'camila.ferreira@email.com', '2023-12-05',
   'Interessada em clareamento. Aguardando tratamento de cáries primeiro.',
   ARRAY['clareamento', 'obturação', 'limpeza']::text[], NOW()),

  -- Pacientes com histórico de lentes
  (gen_random_uuid(), 'Anderson Martins', '(11) 90987-6543', 'anderson.martins@email.com', '2023-07-18',
   'Solicitou avaliação para lentes de contato dental. Enviado plano de tratamento.',
   ARRAY['lentes', 'clareamento', 'limpeza']::text[], NOW()),

  (gen_random_uuid(), 'Patrícia Rocha', '(11) 89876-5432', 'patricia.rocha@email.com', '2024-03-02',
   'Realizou colocação de 8 lentes de porcelana. Resultado excepcional.',
   ARRAY['lentes', 'clareamento']::text[], NOW()),

  -- Pacientes com histórico de canal
  (gen_random_uuid(), 'Roberto Silva Jr', '(11) 88765-4321', 'roberto.jr@email.com', '2023-10-12',
   'Finalizou tratamento de canal no dente 46. Recomendado coroa protética.',
   ARRAY['canal', 'coroa', 'radiografia']::text[], NOW()),

  (gen_random_uuid(), 'Luciana Barbosa', '(11) 87654-3210', 'luciana.barbosa@email.com', '2023-05-25',
   'Tratamento de canal em andamento. Sessão 2 de 3 realizada.',
   ARRAY['canal', 'radiografia']::text[], NOW()),

  -- Pacientes com histórico de extração
  (gen_random_uuid(), 'Thiago Nascimento', '(11) 86543-2109', 'thiago.nascimento@email.com', '2024-01-08',
   'Extração do dente 38 realizada. Pós-operatório sem complicações.',
   ARRAY['extração', 'radiografia']::text[], NOW()),

  (gen_random_uuid(), 'Amanda Carvalho', '(11) 85432-1098', 'amanda.carvalho@email.com', '2023-11-30',
   'Indicação para extração dos sisos. Aguardando agendamento cirúrgico.',
   ARRAY['extração', 'radiografia', 'consulta']::text[], NOW()),

  -- Pacientes diversos (apenas limpeza/prevenção)
  (gen_random_uuid(), 'Gabriel Costa', '(11) 84321-0987', 'gabriel.costa@email.com', '2024-02-20',
   'Paciente assíduo. Realiza limpeza semestral regularmente.',
   ARRAY['limpeza', 'flúor']::text[], NOW()),

  (gen_random_uuid(), 'Isabela Martins', '(11) 83210-9876', 'isabela.martins@email.com', '2023-12-15',
   'Primeira consulta. Sem histórico de tratamentos complexos.',
   ARRAY['consulta', 'limpeza']::text[], NOW()),

  (gen_random_uuid(), 'Felipe Rodrigues', '(11) 82109-8765', 'felipe.rodrigues@email.com', '2023-09-22',
   'Paciente jovem. Orientações de higiene bucal fornecidas.',
   ARRAY['limpeza', 'orientação']::text[], NOW()),

  (gen_random_uuid(), 'Renata Alves', '(11) 81098-7654', 'renata.alves@email.com', '2024-03-10',
   'Limpeza preventiva realizada. Sem necessidades de tratamento no momento.',
   ARRAY['limpeza']::text[], NOW())

ON CONFLICT (id) DO NOTHING;

-- Adicionar mais 30 pacientes para ter uma base robusta
INSERT INTO patients (id, name, phone, last_visit, history_array, created_at)
SELECT
  gen_random_uuid(),
  'Paciente Teste ' || generate_series,
  '(11) 9' || LPAD((80000000 + generate_series)::text, 8, '0'),
  NOW() - (random() * 365 || ' days')::interval,
  ARRAY[(ARRAY['implante', 'ortodontia', 'clareamento', 'lentes', 'canal', 'limpeza'])[floor(random() * 6 + 1)]]::text[],
  NOW()
FROM generate_series(1, 30)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. OPORTUNIDADES DE REATIVAÇÃO (15 exemplos)
-- =====================================================

-- Buscar IDs de pacientes para vincular oportunidades
DO $$
DECLARE
  patient_id_1 uuid;
  patient_id_2 uuid;
  patient_id_3 uuid;
  user_admin_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Pegar 3 pacientes aleatórios
  SELECT id INTO patient_id_1 FROM patients WHERE 'implante' = ANY(history_array) LIMIT 1;
  SELECT id INTO patient_id_2 FROM patients WHERE 'ortodontia' = ANY(history_array) LIMIT 1;
  SELECT id INTO patient_id_3 FROM patients WHERE 'clareamento' = ANY(history_array) LIMIT 1;

  -- Inserir oportunidades
  INSERT INTO opportunities (id, patient_id, name, phone, keyword_found, status, notes, created_at, last_contact, user_id) VALUES
    (gen_random_uuid(), patient_id_1, 'Carlos Alberto Mendes', '(11) 98765-4321', 'implante', 'NEW', NULL, NOW() - interval '2 days', NOW(), user_admin_id),
    (gen_random_uuid(), patient_id_2, 'Juliana Ribeiro', '(11) 95432-1098', 'ortodontia', 'SENT', 'Enviado mensagem via WhatsApp', NOW() - interval '5 days', NOW() - interval '1 day', user_admin_id),
    (gen_random_uuid(), patient_id_3, 'Marcos Vinícius Santos', '(11) 92109-8765', 'clareamento', 'RESPONDED', 'Paciente interessado. Aguardando confirmação de data.', NOW() - interval '7 days', NOW(), user_admin_id)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- =====================================================
-- 5. NOTIFICAÇÕES DE TESTE
-- =====================================================

INSERT INTO notifications (id, title, message, type, read, user_id, created_at) VALUES
  -- Notificações globais
  (gen_random_uuid(), 'Bem-vindo ao ClinicaFlow!', 'Sistema de gestão odontológica pronto para uso.', 'success', false, NULL, NOW() - interval '1 hour'),
  (gen_random_uuid(), 'Nova funcionalidade', 'Sistema de notificações em tempo real habilitado!', 'info', false, NULL, NOW() - interval '30 minutes'),

  -- Notificações para admin
  (gen_random_uuid(), 'Novo paciente adicionado', 'Carlos Alberto foi adicionado ao pipeline de reativação.', 'info', false, 'a0000000-0000-0000-0000-000000000001'::uuid, NOW() - interval '15 minutes'),
  (gen_random_uuid(), 'Agendamento confirmado', 'Paciente Juliana Ribeiro confirmou consulta para 15/12.', 'success', false, 'a0000000-0000-0000-0000-000000000001'::uuid, NOW() - interval '5 minutes'),
  (gen_random_uuid(), 'Meta atingida!', 'Parabéns! 10 agendamentos realizados neste mês.', 'success', true, 'a0000000-0000-0000-0000-000000000001'::uuid, NOW() - interval '1 day')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. ESTATÍSTICAS E ÍNDICES
-- =====================================================

-- Atualizar estatísticas do banco
ANALYZE patients;
ANALYZE opportunities;
ANALYZE notifications;
ANALYZE users;

-- Verificar contagens
DO $$
DECLARE
  count_patients int;
  count_opportunities int;
  count_notifications int;
  count_users int;
BEGIN
  SELECT COUNT(*) INTO count_patients FROM patients;
  SELECT COUNT(*) INTO count_opportunities FROM opportunities;
  SELECT COUNT(*) INTO count_notifications FROM notifications;
  SELECT COUNT(*) INTO count_users FROM users;

  RAISE NOTICE '=================================';
  RAISE NOTICE 'SEED DATA INSERIDO COM SUCESSO!';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Pacientes: %', count_patients;
  RAISE NOTICE 'Oportunidades: %', count_opportunities;
  RAISE NOTICE 'Notificações: %', count_notifications;
  RAISE NOTICE 'Usuários: %', count_users;
  RAISE NOTICE '=================================';
END $$;

-- =====================================================
-- FIM DO SEED DATA
-- =====================================================

-- OBSERVAÇÕES:
-- 1. Em produção, use senhas hash reais com bcrypt
-- 2. Ajuste UUIDs de usuários conforme necessário
-- 3. Personalize dados conforme sua clínica
-- 4. Execute apenas uma vez em cada ambiente
