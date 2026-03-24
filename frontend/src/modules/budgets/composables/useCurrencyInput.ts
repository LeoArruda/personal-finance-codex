import { computed, ref } from "vue";

function formatMinorUnitsToCurrency(amountMinor: string): string {
  const amount = Number(amountMinor) / 100;

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function parseCurrencyToMinorUnits(value: string): string | null {
  const normalized = value.replace(/[^0-9.-]/g, "");

  if (!normalized || normalized === "-" || normalized === ".") {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return String(Math.round(parsed * 100));
}

export function useCurrencyInput(initialMinorValue: string) {
  const initialDisplayValue = formatMinorUnitsToCurrency(initialMinorValue);
  const displayValue = ref(initialDisplayValue);

  const parsedMinorValue = computed(() => parseCurrencyToMinorUnits(displayValue.value));

  function reset(nextMinorValue = initialMinorValue) {
    displayValue.value = formatMinorUnitsToCurrency(nextMinorValue);
  }

  return {
    displayValue,
    parsedMinorValue,
    initialDisplayValue,
    reset
  };
}
