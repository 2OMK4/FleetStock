/** UI-facing API error categories. The API and Postgres still own validation. */
export const apiErrorKeys = [
  "generic", "loadInventory", "createItem", "updateItem", "archiveItem",
  "loadVehicles", "saveVehicle", "loadTripData", "loadTrips",
  "startTrip", "returnTrip", "duplicateBarcode", "duplicateRegistration",
  "insufficientStock", "activeTrip", "alreadyReturned", "archiveActiveTrip",
  "barcodeNotFound", "positiveQuantity", "notEnoughStock", "duplicateTripItem",
  "selectVehicle", "addTripItem", "invalidReturnedQuantity",
  "quantityExceedsTaken", "invalidQuantity", "notFound", "conflict",
  "unauthorized", "invalidRequest",
] as const;

export type ApiErrorKey = (typeof apiErrorKeys)[number];

export function classifyApiError(raw: unknown, fallback: ApiErrorKey): ApiErrorKey {
  if (typeof raw !== "string") return fallback;
  const message = raw.toLowerCase();
  if (/sign in|unauthori[sz]ed|authentication required|not authenticated/.test(message)) return "unauthorized";
  if (/cannot archive.*active trip|archive.*active trip/.test(message)) return "archiveActiveTrip";
  if (/already been returned|already.*completed/.test(message)) return "alreadyReturned";
  if (/already has an active trip|active trip/.test(message)) return "activeTrip";
  if (/returned quantity cannot exceed|cannot return more/.test(message)) return "quantityExceedsTaken";
  if (/insufficient stock|not enough stock/.test(message)) return "insufficientStock";
  if (/duplicate item.*trip/.test(message)) return "duplicateTripItem";
  if (/barcode.*(already|exists|used)|this barcode already exists/.test(message)) return "duplicateBarcode";
  if (/registration.*(already|exists|used)/.test(message)) return "duplicateRegistration";
  if (/already exists|unique constraint|duplicate key/.test(message)) {
    return fallback === "saveVehicle" ? "duplicateRegistration" : "duplicateBarcode";
  }
  if (/changed.*refresh|refresh and retry|stock changed/.test(message)) return "conflict";
  if (/item.*not found|barcode.*not found/.test(message)) return "barcodeNotFound";
  if (/not found/.test(message)) return "notFound";
  if (/invalid quantity|invalid returned quantity/.test(message)) return "invalidQuantity";
  if (/invalid json|invalid request|invalid body/.test(message)) return "invalidRequest";
  return fallback;
}

export const unitKeys = ["piece", "meter", "pair", "box", "kg", "liter"] as const;
export type UnitKey = (typeof unitKeys)[number];

export function getUnitKey(value: string): UnitKey | null {
  const normalized = value.toLowerCase().trim();
  return unitKeys.find((key) => key === normalized) ?? null;
}

export const vehicleTypeKeys = ["van", "truck", "pickup", "suv"] as const;
export type VehicleTypeKey = (typeof vehicleTypeKeys)[number];

export function getVehicleTypeKey(value: string): VehicleTypeKey | null {
  const normalized = value.toLowerCase().trim();
  return vehicleTypeKeys.find((key) => key === normalized) ?? null;
}
