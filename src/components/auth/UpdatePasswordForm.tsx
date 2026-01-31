import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    return passwordStrength?.length && passwordsMatch === true;
  }, [passwordStrength, passwordsMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!password || !confirmPassword) {
      setError("Proszę wypełnić wszystkie pola.");
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
      // TODO: Implement Supabase auth integration
      // Listen for PASSWORD_RECOVERY event and update password
      // const { error } = await supabase.auth.updateUser({
      //   password: password,
      // });

      // if (error) throw error;

      setSuccess(true);
      // eslint-disable-next-line no-console
      console.log("Password updated successfully");

      // Redirect to login after a short delay
      // setTimeout(() => {
      //   window.location.href = "/login";
      // }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd podczas aktualizacji hasła.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="size-6 text-green-600 dark:text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Hasło zostało zmienione</h1>
          <p className="text-muted-foreground">
            Twoje hasło zostało pomyślnie zaktualizowane. Za chwilę zostaniesz przekierowany do strony logowania.
          </p>
        </div>

        <Button asChild className="w-full">
          <a href="/login">Przejdź do logowania</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Ustaw nowe hasło</h1>
        <p className="text-muted-foreground">Wprowadź nowe hasło dla swojego konta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            aria-invalid={password.length > 0 && !passwordStrength?.length ? "true" : "false"}
            autoComplete="new-password"
            autoFocus
          />
          {password.length > 0 && passwordStrength && (
            <div className="space-y-1 text-sm">
              <PasswordRequirement met={passwordStrength.length} text={`Co najmniej ${MIN_PASSWORD_LENGTH} znaków`} />
              <PasswordRequirement met={passwordStrength.uppercase} text="Jedna wielka litera" />
              <PasswordRequirement met={passwordStrength.lowercase} text="Jedna mała litera" />
              <PasswordRequirement met={passwordStrength.number} text="Jedna cyfra" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            aria-invalid={confirmPassword.length > 0 && passwordsMatch === false ? "true" : "false"}
            autoComplete="new-password"
          />
          {confirmPassword.length > 0 && passwordsMatch !== null && (
            <PasswordRequirement
              met={passwordsMatch}
              text={passwordsMatch ? "Hasła są zgodne" : "Hasła nie są zgodne"}
            />
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Błąd</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={!isFormValid || isLoading} className="w-full">
          {isLoading ? "Aktualizacja..." : "Zaktualizuj hasło"}
        </Button>
      </form>
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
