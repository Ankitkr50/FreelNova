const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];
const SUPPORTED_LANGUAGES = ["en", "hi", "es", "fr", "de", "ar"];

/**
 * Formats multi-currency values and localization settings.
 */
const formatGlobalCurrency = (amount, targetCurrency = "INR") => {
  const rates = {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    AED: 0.044,
    SGD: 0.016,
  };

  const rate = rates[targetCurrency] || 1;
  const converted = amount * rate;

  return {
    originalAmountInr: amount,
    targetCurrency,
    convertedAmount: Number(converted.toFixed(2)),
    formattedString: `${targetCurrency} ${converted.toLocaleString()}`,
  };
};

module.exports = {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  formatGlobalCurrency,
};
