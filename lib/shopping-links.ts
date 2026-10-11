function pcPartPickerQuery(name: string): string {
  return name
    .replace("Intel Core ", "")         // "i9-14900K"
    .replace(/AMD Ryzen \d+ /, "")      // "5950X", "7950X"
    .replace("NVIDIA GeForce ", "")     // "RTX 3090"
    .replace("AMD Radeon ", "");        // "RX 7900 XTX"
}

export function buildGoogleShoppingUrl(modelName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(modelName)}&tbm=shop`;
}

export function buildPcPartPickerUrl(modelName: string): string {
  return `https://pcpartpicker.com/search/?q=${encodeURIComponent(pcPartPickerQuery(modelName))}`;
}
