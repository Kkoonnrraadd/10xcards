import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const passwordStrength = useMemo(() => {
    if (password.length === 0) return null;

    const checks = {
      length: password.length >= MIN_PASSWORD_LENGTH,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    return checks;
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (confirmPassword.length === 0) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const isFormValid = useMemo(() => {
    return validateEmail(email) && passwordStrength?.length && passwordsMatch === true;
  }, [email, passwordStrength, passwordsMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side validation
    if (!email || !password || !confirmPassword) {
      setError("Proszę wypełnić wszystkie pola.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Proszę podać prawidłowy adres e-mail.");
      return;
    }

    if (!passwordStrength?.length) {
      setError(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }

    if (passwordsMatch !== true) {
      setError("Hasła nie są zgodne.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Wystąpił błąd podczas rejestracji.");
        return;
      }

      // Show success message - user needs to confirm email
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd podczas rejestracji.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // If registration was successful, show confirmation message
  if (success) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6" data-testid="register-success-message">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Sprawdź swoją skrzynkę e-mail</h1>
          <p className="text-muted-foreground">
            Wysłaliśmy link aktywacyjny na adres <strong>{email}</strong>
          </p>
        </div>

        <Alert data-testid="register-success-alert">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Rejestracja zakończona pomyślnie</AlertTitle>
          <AlertDescription>
            Aby dokończyć proces rejestracji, kliknij w link aktywacyjny wysłany na Twój adres e-mail. Link jest ważny
            przez 24 godziny.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Nie otrzymałeś wiadomości? Sprawdź folder spam lub spróbuj ponownie.
          </p>
          <Button
            variant="outline"
            onClick={() => setSuccess(false)}
            className="w-full"
            data-testid="back-to-register-button"
          >
            Wróć do formularza rejestracji
          </Button>
          <div className="text-center text-sm">
            <a href="/login" className="text-primary hover:underline font-medium" data-testid="go-to-login-link">
              Przejdź do logowania
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6" data-testid="register-form">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold" data-testid="register-heading">
          Utwórz konto
        </h1>
        <p className="text-muted-foreground">Wprowadź swoje dane, aby rozpocząć korzystanie z 10xCards</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            aria-invalid={email.length > 0 && !validateEmail(email) ? "true" : "false"}
            autoComplete="email"
            data-testid="register-email-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            aria-invalid={password.length > 0 && !passwordStrength?.length ? "true" : "false"}
            autoComplete="new-password"
            data-testid="register-password-input"
          />
          {password.length > 0 && passwordStrength && (
            <div className="space-y-1 text-sm" data-testid="password-requirements">
              <PasswordRequirement met={passwordStrength.length} text={`Co najmniej ${MIN_PASSWORD_LENGTH} znaków`} />
              <PasswordRequirement met={passwordStrength.uppercase} text="Jedna wielka litera" />
              <PasswordRequirement met={passwordStrength.lowercase} text="Jedna mała litera" />
              <PasswordRequirement met={passwordStrength.number} text="Jedna cyfra" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            aria-invalid={confirmPassword.length > 0 && passwordsMatch === false ? "true" : "false"}
            autoComplete="new-password"
            data-testid="register-confirm-password-input"
          />
          {confirmPassword.length > 0 && passwordsMatch !== null && (
            <PasswordRequirement
              met={passwordsMatch}
              text={passwordsMatch ? "Hasła są zgodne" : "Hasła nie są zgodne"}
            />
          )}
        </div>

        {error && (
          <Alert variant="destructive" data-testid="register-error-alert">
            <AlertCircle />
            <AlertTitle>Błąd rejestracji</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="w-full"
          data-testid="register-submit-button"
        >
          {isLoading ? "Rejestracja..." : "Zarejestruj się"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Masz już konto? </span>
        <a href="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
          Zaloguj się
        </a>
      </div>
    </div>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={met ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}
