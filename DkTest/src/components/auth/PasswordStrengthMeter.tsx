import React from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  email?: string;
}

export function evaluatePasswordStrength(password: string, email?: string): {
  score: number; // 0 to 4
  label: string;
  color: string;
  barColor: string;
  rules: { text: string; passed: boolean }[];
} {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const notEmail = !email || !email.includes("@") || !password.toLowerCase().includes(email.split("@")[0].toLowerCase());

  const rules = [
    { text: "Tối thiểu 8 ký tự", passed: hasMinLength },
    { text: "Có ít nhất một chữ cái", passed: hasLetter },
    { text: "Có ít nhất một chữ số", passed: hasNumber },
    { text: "Khuyến nghị có ký tự đặc biệt (!@#$%...)", passed: hasSpecial },
  ];

  let score = 0;
  if (hasMinLength) score++;
  if (hasLetter) score++;
  if (hasNumber) score++;
  if (hasSpecial && password.length >= 10) score++;
  if (!notEmail && score > 0) score--;

  let label = "Rất yếu";
  let color = "text-slate-400";
  let barColor = "bg-slate-200";

  if (password.length > 0) {
    if (score <= 1) {
      label = "Yếu";
      color = "text-red-500";
      barColor = "bg-red-500";
    } else if (score === 2) {
      label = "Trung bình";
      color = "text-amber-500";
      barColor = "bg-amber-500";
    } else if (score === 3) {
      label = "Mạnh";
      color = "text-blue-500";
      barColor = "bg-blue-500";
    } else {
      label = "Rất mạnh";
      color = "text-emerald-500";
      barColor = "bg-emerald-500";
    }
  }

  return { score, label, color, barColor, rules };
}

export default function PasswordStrengthMeter({ password, email }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, color, barColor, rules } = evaluatePasswordStrength(password, email);

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Độ mạnh mật khẩu:</span>
        <span className={`font-bold ${color}`}>{label}</span>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= score ? barColor : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Rule requirements */}
      <div className="grid grid-cols-2 gap-1 pt-1">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            {rule.passed ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-300 shrink-0" />
            )}
            <span className={rule.passed ? "text-slate-700 font-medium" : "text-slate-400"}>
              {rule.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
