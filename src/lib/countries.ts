export type Country = {
  iso: string;
  code: string; // dial code sem +
  flag: string;
  name: string;
};

/**
 * Lista de países priorizada pra CRM BR: Brasil primeiro, depois os mais comuns.
 * Bandeiras como emoji regional indicator — funciona em todos os browsers.
 */
export const COUNTRIES: Country[] = [
  { iso: "BR", code: "55", flag: "🇧🇷", name: "Brasil" },
  { iso: "PT", code: "351", flag: "🇵🇹", name: "Portugal" },
  { iso: "US", code: "1", flag: "🇺🇸", name: "Estados Unidos" },
  { iso: "CA", code: "1", flag: "🇨🇦", name: "Canadá" },
  { iso: "AR", code: "54", flag: "🇦🇷", name: "Argentina" },
  { iso: "UY", code: "598", flag: "🇺🇾", name: "Uruguai" },
  { iso: "PY", code: "595", flag: "🇵🇾", name: "Paraguai" },
  { iso: "CL", code: "56", flag: "🇨🇱", name: "Chile" },
  { iso: "CO", code: "57", flag: "🇨🇴", name: "Colômbia" },
  { iso: "MX", code: "52", flag: "🇲🇽", name: "México" },
  { iso: "PE", code: "51", flag: "🇵🇪", name: "Peru" },
  { iso: "BO", code: "591", flag: "🇧🇴", name: "Bolívia" },
  { iso: "VE", code: "58", flag: "🇻🇪", name: "Venezuela" },
  { iso: "EC", code: "593", flag: "🇪🇨", name: "Equador" },
  { iso: "ES", code: "34", flag: "🇪🇸", name: "Espanha" },
  { iso: "FR", code: "33", flag: "🇫🇷", name: "França" },
  { iso: "IT", code: "39", flag: "🇮🇹", name: "Itália" },
  { iso: "DE", code: "49", flag: "🇩🇪", name: "Alemanha" },
  { iso: "GB", code: "44", flag: "🇬🇧", name: "Reino Unido" },
  { iso: "NL", code: "31", flag: "🇳🇱", name: "Holanda" },
  { iso: "BE", code: "32", flag: "🇧🇪", name: "Bélgica" },
  { iso: "CH", code: "41", flag: "🇨🇭", name: "Suíça" },
  { iso: "AT", code: "43", flag: "🇦🇹", name: "Áustria" },
  { iso: "SE", code: "46", flag: "🇸🇪", name: "Suécia" },
  { iso: "NO", code: "47", flag: "🇳🇴", name: "Noruega" },
  { iso: "DK", code: "45", flag: "🇩🇰", name: "Dinamarca" },
  { iso: "FI", code: "358", flag: "🇫🇮", name: "Finlândia" },
  { iso: "IE", code: "353", flag: "🇮🇪", name: "Irlanda" },
  { iso: "PL", code: "48", flag: "🇵🇱", name: "Polônia" },
  { iso: "CZ", code: "420", flag: "🇨🇿", name: "Rep. Tcheca" },
  { iso: "GR", code: "30", flag: "🇬🇷", name: "Grécia" },
  { iso: "RU", code: "7", flag: "🇷🇺", name: "Rússia" },
  { iso: "JP", code: "81", flag: "🇯🇵", name: "Japão" },
  { iso: "KR", code: "82", flag: "🇰🇷", name: "Coreia do Sul" },
  { iso: "CN", code: "86", flag: "🇨🇳", name: "China" },
  { iso: "HK", code: "852", flag: "🇭🇰", name: "Hong Kong" },
  { iso: "TW", code: "886", flag: "🇹🇼", name: "Taiwan" },
  { iso: "SG", code: "65", flag: "🇸🇬", name: "Singapura" },
  { iso: "IN", code: "91", flag: "🇮🇳", name: "Índia" },
  { iso: "AU", code: "61", flag: "🇦🇺", name: "Austrália" },
  { iso: "NZ", code: "64", flag: "🇳🇿", name: "Nova Zelândia" },
  { iso: "IL", code: "972", flag: "🇮🇱", name: "Israel" },
  { iso: "AE", code: "971", flag: "🇦🇪", name: "Emirados Árabes" },
  { iso: "SA", code: "966", flag: "🇸🇦", name: "Arábia Saudita" },
  { iso: "TR", code: "90", flag: "🇹🇷", name: "Turquia" },
  { iso: "ZA", code: "27", flag: "🇿🇦", name: "África do Sul" },
  { iso: "EG", code: "20", flag: "🇪🇬", name: "Egito" },
  { iso: "MA", code: "212", flag: "🇲🇦", name: "Marrocos" },
  { iso: "NG", code: "234", flag: "🇳🇬", name: "Nigéria" },
  { iso: "KE", code: "254", flag: "🇰🇪", name: "Quênia" },
  { iso: "AO", code: "244", flag: "🇦🇴", name: "Angola" },
  { iso: "MZ", code: "258", flag: "🇲🇿", name: "Moçambique" },
];

export function findCountryByIso(iso: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso === iso);
}

export function findCountryByCode(code: string): Country | undefined {
  // Retorna o primeiro que bate — ambíguo pra +1 (US vs CA), assume US
  return COUNTRIES.find((c) => c.code === code);
}

/**
 * Formata o número de telefone conforme o país selecionado.
 * Mantém apenas dígitos internamente, aplica máscara visual.
 */
export function formatPhone(raw: string, iso: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 0) return "";

  switch (iso) {
    case "BR": {
      // (11) 98765-4321 ou (11) 8765-4321
      if (d.length <= 2) return `(${d}`;
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10)
        return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
    }
    case "US":
    case "CA": {
      if (d.length <= 3) return `(${d}`;
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    }
    case "PT":
    case "ES":
    case "FR": {
      // 3-3-3 ou 3-3-4
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
    }
    case "AR": {
      // 11 1234-5678 (AR tem DDD variável, simplifica)
      if (d.length <= 2) return d;
      if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6, 10)}`;
    }
    case "MX": {
      if (d.length <= 2) return d;
      if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6, 10)}`;
    }
    case "GB": {
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4, 10)}`;
    }
    default: {
      // Fallback: agrupa de 3 em 3
      return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
    }
  }
}

export function getMaxDigits(iso: string): number {
  switch (iso) {
    case "BR":
      return 11;
    case "US":
    case "CA":
      return 10;
    case "GB":
      return 10;
    default:
      return 15;
  }
}

export function getPlaceholder(iso: string): string {
  switch (iso) {
    case "BR":
      return "(11) 98765-4321";
    case "US":
    case "CA":
      return "(555) 123-4567";
    case "PT":
      return "912 345 678";
    case "ES":
      return "612 345 678";
    case "AR":
      return "11 1234-5678";
    case "MX":
      return "55 1234-5678";
    case "GB":
      return "7400 123456";
    default:
      return "Digite o número";
  }
}
