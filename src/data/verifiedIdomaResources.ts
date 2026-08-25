import type { EmergencyResource } from "@/types/resource";

/**
 * Public facilities whose identity/address were checked against a government
 * directory. Coordinates are independently cross-checked map coordinates.
 * Availability and capacity are intentionally omitted because the sources do
 * not provide live operational status.
 */
export const VERIFIED_IDOMA_RESOURCES: EmergencyResource[] = [
  {
    id: "verified-idoma-fuhs-teaching-hospital-otukpo",
    name: "Federal University of Health Sciences Teaching Hospital, Otukpo",
    category: "hospital",
    description:
      "Federal teaching hospital listed by Nigeria's Federal Ministry of Health and Social Welfare.",
    address: "6544+23Q, Otukpo 972261, Benue State",
    community: "Otukpo",
    lga: "Otukpo",
    state: "Benue",
    country: "Nigeria",
    lat: 7.2050778,
    lng: 8.1552272,
    verificationStatus: "verified",
    visibility: "public",
    isPublic: true,
    services: ["emergency_medical_care", "general_medical_care", "medicine"],
    lastVerifiedAt: "2026-08-25T00:00:00.000Z",
    verificationSourceUrl: "https://health.gov.ng/teaching-hospitals/",
    verificationSourceRecordId: "FMOH-teaching-hospitals:FUHSTH-Otukpo",
  },
  {
    id: "verified-idoma-royal-specialist-hospital-otukpo",
    name: "Royal Specialist Hospital, Otukpo",
    category: "hospital",
    description:
      "Private medical facility listed in the UK government's Nigeria medical-facilities directory.",
    address: "1 Agatu Street, Otukpo, Benue State",
    community: "Otukpo",
    lga: "Otukpo",
    state: "Benue",
    country: "Nigeria",
    lat: 7.1921247,
    lng: 8.1377697,
    email: "info@royalspecialist.com",
    verificationStatus: "verified",
    visibility: "public",
    isPublic: true,
    services: ["emergency_medical_care", "general_medical_care"],
    lastVerifiedAt: "2026-08-25T00:00:00.000Z",
    verificationSourceUrl:
      "https://www.gov.uk/government/publications/nigeria-list-of-medical-facilitiespractitioners/nigeria-list-of-medical-facilities",
    verificationSourceRecordId: "GOV.UK:Nigeria:Royal-Specialist-Hospital-Benue",
  },
];
