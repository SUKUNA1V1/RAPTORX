interface FormatOptions {
  style?: Intl.NumberFormatOptions['style'];
  currency?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

export const formatNumber = (
  price: number,
  format: string = 'en-IN',
  options: FormatOptions = { style: 'currency', currency: 'USD' },
): string => {
  const intlOptions: Intl.NumberFormatOptions = {
    style: options.style,
    currency: options.currency,
    maximumFractionDigits: options.maximumFractionDigits,
    minimumFractionDigits: options.minimumFractionDigits,
  };

  return new Intl.NumberFormat(format, {
    ...intlOptions,
  }).format(price);
};
