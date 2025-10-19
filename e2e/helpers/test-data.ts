/**
 * Test Data and Helper Functions for E2E Tests
 * 
 * This file contains:
 * - Sample data for testing
 * - Helper functions for common operations
 * - Test utilities
 */

/**
 * Generate a unique email address for testing
 */
export function generateUniqueEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate a valid password for testing
 */
export function generateValidPassword(): string {
  return 'TestPassword123!';
}

/**
 * Sample text for flashcard generation (valid length: 1000+ characters)
 */
export const VALID_SOURCE_TEXT = `
Sztuczna inteligencja (AI) to dziedzina informatyki zajmująca się tworzeniem systemów zdolnych do wykonywania zadań wymagających ludzkiej inteligencji. Obejmuje to uczenie maszynowe, przetwarzanie języka naturalnego, rozpoznawanie obrazów i wiele innych obszarów.

Uczenie maszynowe jest kluczowym elementem AI, umożliwiającym systemom uczenie się na podstawie danych bez bezpośredniego programowania. Istnieją trzy główne typy uczenia maszynowego: nadzorowane, nienadzorowane i ze wzmocnieniem.

W uczeniu nadzorowanym model jest trenowany na oznaczonych danych, gdzie każdy przykład ma przypisaną poprawną odpowiedź. Model uczy się mapowania między danymi wejściowymi a wyjściowymi.

Uczenie nienadzorowane polega na znajdowaniu wzorców w danych bez etykiet. Algorytmy grupowania i redukcji wymiarowości są przykładami tego podejścia.

Uczenie ze wzmocnieniem to metoda, w której agent uczy się podejmować decyzje poprzez interakcję ze środowiskiem, otrzymując nagrody lub kary za swoje działania.

Sieci neuronowe to modele inspirowane strukturą ludzkiego mózgu, składające się z warstw połączonych neuronów. Głębokie sieci neuronowe, zawierające wiele warstw ukrytych, są podstawą głębokiego uczenia.

Deep learning wykorzystuje głębokie sieci neuronowe do rozwiązywania złożonych problemów. Architektury takie jak CNN (Convolutional Neural Networks) są używane do przetwarzania obrazów, podczas gdy RNN (Recurrent Neural Networks) są stosowane do analizy sekwencji.
`.trim();

/**
 * Short text that should trigger validation error (< 1000 characters)
 */
export const SHORT_TEXT = 'To jest za krótki tekst do wygenerowania fiszek.';

/**
 * Long text that exceeds maximum length (> 10000 characters)
 */
export const LONG_TEXT = 'A'.repeat(10001);

/**
 * Sample valid user credentials for testing
 */
export const TEST_USERS = {
  valid: {
    email: 'test-user@example.com',
    password: 'TestPassword123!',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
};

/**
 * Sample flashcard data
 */
export const SAMPLE_FLASHCARDS = [
  {
    front: 'Co to jest sztuczna inteligencja?',
    back: 'Dziedzina informatyki zajmująca się tworzeniem systemów zdolnych do wykonywania zadań wymagających ludzkiej inteligencji.',
  },
  {
    front: 'Jakie są trzy główne typy uczenia maszynowego?',
    back: 'Uczenie nadzorowane, nienadzorowane i ze wzmocnieniem.',
  },
  {
    front: 'Co to jest uczenie nadzorowane?',
    back: 'Metoda uczenia maszynowego, w której model jest trenowany na oznaczonych danych z przypisanymi poprawnymi odpowiedziami.',
  },
];

/**
 * Validation constants
 */
export const VALIDATION = {
  MIN_TEXT_LENGTH: 1000,
  MAX_TEXT_LENGTH: 10000,
  MIN_PASSWORD_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },
};

/**
 * Test timeouts
 */
export const TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 3000,
  LONG: 10000,
  GENERATION: 30000, // AI generation might take longer
};

/**
 * Sample invalid passwords for testing validation
 */
export const INVALID_PASSWORDS = {
  tooShort: 'Pass1',
  noUppercase: 'password123',
  noLowercase: 'PASSWORD123',
  noNumber: 'PasswordABC',
  valid: 'Password123',
};

/**
 * Sample invalid emails for testing validation
 */
export const INVALID_EMAILS = [
  'notanemail',
  '@example.com',
  'user@',
  'user @example.com',
  '',
];

/**
 * API endpoints (for reference)
 */
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
  },
  FLASHCARDS: {
    GENERATE: '/api/flashcards/generate',
    CREATE: '/api/flashcards',
    LIST: '/api/flashcards',
  },
  GENERATION_LOGS: {
    CREATE: '/api/generation-logs',
  },
};

/**
 * Expected error messages (for assertion)
 */
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Nieprawidłowy adres e-mail lub hasło.',
  EMAIL_NOT_CONFIRMED: 'Proszę potwierdzić swój adres e-mail przed zalogowaniem.',
  PASSWORDS_DONT_MATCH: 'Hasła nie są zgodne.',
  INVALID_EMAIL: 'Proszę podać prawidłowy adres e-mail.',
  PASSWORD_TOO_SHORT: 'Hasło musi mieć co najmniej 8 znaków.',
  TEXT_TOO_SHORT: 'Tekst musi mieć od 1000 do 10000 znaków.',
  REQUIRED_FIELDS: 'Proszę wypełnić wszystkie pola.',
};

