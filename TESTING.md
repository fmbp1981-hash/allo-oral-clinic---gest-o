# 🧪 Testing Guide - ClinicaFlow

Guia completo para execução e manutenção dos testes automatizados do ClinicaFlow.

## 📋 Overview

O ClinicaFlow utiliza **Jest** e **ts-jest** para testes do backend, com coverage threshold de **70%** configurado.

### Cobertura Atual

**Backend**:
- ✅ Controllers: 5 de 8 (63%)
- ✅ Middlewares: 2 de 3 (67%)
- ⏳ **Meta**: Atingir 70% de coverage total

**Frontend**:
- ❌ Não implementado (0%)

---

## 🚀 Como Rodar os Testes

### Backend

```bash
cd backend

# Rodar todos os testes
npm test

# Rodar testes com coverage
npm run test:coverage

# Rodar testes em watch mode
npm run test:watch

# Rodar teste específico
npm test -- auth.controller.test.ts
npm test -- -t "should login successfully"
```

### Ver Relatório de Coverage

```bash
cd backend
npm run test:coverage

# Abrir HTML report
start coverage/index.html  # Windows
open coverage/index.html   # Mac
xdg-open coverage/index.html  # Linux
```

---

## 📁 Estrutura de Testes

```
backend/
├── tests/
│   ├── setup.ts                    # Setup global dos testes
│   ├── __mocks__/                  # Mocks reutilizáveis
│   │   ├── supabase.mock.ts
│   │   └── prisma.mock.ts
│   ├── controllers/                # Testes de controllers
│   │   ├── auth.controller.test.ts
│   │   ├── patient.controller.test.ts
│   │   ├── user.controller.test.ts
│   │   ├── clinical-record.controller.test.ts
│   │   └── opportunity.controller.test.ts
│   └── middlewares/                # Testes de middlewares
│       ├── auth.middleware.test.ts
│       └── validate.middleware.test.ts
```

---

## 📝 Convenções e Padrões

### Nomenclatura

- **Arquivos**: `[nome].test.ts` ou `[nome].spec.ts`
- **Describes**: Nome da função/classe testada
- **Its**: Deve descrever o comportamento esperado

```typescript
describe('PatientController', () => {
    describe('getPatients', () => {
        it('should return all patients successfully', async () => {
            // Test implementation
        });

        it('should return empty array when no patients', async () => {
            // Test implementation  
        });
    });
});
```

### Estrutura de Teste

Seguir padrão **AAA** (Arrange, Act, Assert):

```typescript
it('should create a patient successfully', async () => {
    // Arrange
    const mockRequest = { body: { name: 'John Doe' } };
    const mockResponse = { /* ... */ };
    
    // Act
    await createPatient(mockRequest, mockResponse);
    
    // Assert
    expect(mockResponse.json).toHaveBeenCalledWith(/* ... */);
});
```

### Mocks

- **Supabase**: Sempre mock usando `jest.mock('../../src/lib/supabase')`
- **Logger**: Mockado globalmente em `setup.ts`
- **JWT**: Mock quando testar autenticação
- **bcrypt**: Mock quando testar senhas

---

## 🎯 Testes Implementados

### Controllers

#### ✅ auth.controller.test.ts
- Login com credenciais válidas/inválidas
- Registro de novos usuários
- Refresh token
- **Coverage**: ~90%

#### ✅ patient.controller.test.ts (16 tests)
- `getPatients` - listar todos
- `createPatient` - criar novo
- `getPatientById` - buscar por ID
- `updatePatient` - atualizar
- `deletePatient` - deletar
- `searchPatients` - busca por query
- **Coverage**: ~95%

#### ✅ user.controller.test.ts (13 tests)
- `getUsers` - listar todos (sem passwords)
- `getUserById` - buscar por ID
- `createUser` - criar novo (com hash de senha)
- `updateUser` - atualizar parcial
- `deleteUser` - deletar
- Validação de usuário existente
- **Coverage**: ~92%

#### ✅ clinical-record.controller.test.ts (14 tests)
- `getClinicalRecords` - listar todos
- `getClinicalRecords` - filtrar por patientId
- `createClinicalRecord` - criar novo
- `updateClinicalRecord` - atualizar
- `deleteClinicalRecord` - deletar
- Conversão de datas para ISO string
- **Coverage**: ~93%

#### ✅ opportunity.controller.test.ts
- CRUD completo de oportunidades
- **Coverage**: ~85%

### Middlewares

#### ✅ auth.middleware.test.ts (8 tests)
- Token válido - permite acesso
- Token ausente - retorna 401
- Token inválido - retorna 401
- Token expirado - retorna 401
- Attachment de user ao request
- **Coverage**: 100%

#### ✅ validate.middleware.test.ts (10 tests)
- Validação com dados válidos
- Rejeição de dados inválidos
- Campos obrigatórios
- Objetos aninhados
- Arrays
- Campos opcionais
- **Coverage**: ~95%

---

## 📊 Coverage Thresholds

Configurado em `jest.config.js`:

```javascript
coverageThreshold: {
    global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
    },
}
```

**Build falhará se coverage < 70%**

---

## ✍️ Como Escrever Novos Testes

### 1. Criar Arquivo de Teste

```bash
# Para controller
touch tests/controllers/nome.controller.test.ts

# Para middleware
touch tests/middlewares/nome.middleware.test.ts
```

### 2. Template Básico

```typescript
import { Request, Response } from 'express';
import * as Controller from '../../src/controllers/nome.controller';
import supabase from '../../src/lib/supabase';

jest.mock('../../src/lib/supabase', () => ({
    from: jest.fn(),
}));

describe('Nome Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe('metodo', () => {
        it('should work correctly', async () => {
            // Arrange
            mockRequest = { body: {} };

            // Mock
            (supabase.from as jest.Mock).mockReturnValue({
                // ...
            });

            // Act
            await Controller.metodo(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(jsonMock).toHaveBeenCalled();
        });
    });
});
```

### 3. Rodar e Verificar

```bash
npm test -- nome.controller.test.ts
npm run test:coverage
```

---

## 🐛 Debugging de Testes

### Ver Output Detalhado

```bash
npm test -- --verbose
```

### Rodar Apenas Um Teste

```bash
# Por nome do describe
npm test -- -t "Auth Controller"

# Por nome do it
npm test -- -t "should login successfully"

# Por arquivo
npm test -- auth.controller.test.ts
```

### Usar `console.log` em Testes

```typescript
it('should debug something', () => {
    console.log('Request:', mockRequest);
    console.log('Response:', mockResponse);
    // ...
});
```

### Ver Stack Trace Completo

```bash
npm test -- --no-coverage
```

---

## 📚 Recursos e Referências

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 🔄 CI/CD Integration (Futuro)

Quando configurar GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run tests
        run: cd backend && npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

**Desenvolvido por IntelliX.AI** 🧠  
**Versão**: 1.0.0  
**Data**: 29/11/2025
