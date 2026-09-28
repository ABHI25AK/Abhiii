export const DEFAULT_WEIGHTS = {
  landslide: 0.35,
  rainfall: 0.25,
  flood: 0.20,
  historical: 0.20,
  hazard: 0.45,
  exposure: 0.25,
  vulnerability: 0.20,
  responseGap: 0.10,
};

export function calculateHabitationRisk(h, weights = DEFAULT_WEIGHTS) {
  const hazardScore =
    h.landslideScore * weights.landslide +
    h.rainfallScore * weights.rainfall +
    h.floodScore * weights.flood +
    h.historicalIncidentScore * weights.historical;

  // exposure: map population (0-1000) and households (0-300) to 0-100
  const popScore = Math.min(100, (h.population / 1000) * 100);
  const hhScore = Math.min(100, (h.households / 300) * 100);
  const exposureScore = (popScore + hhScore) / 2;

  // vulnerability: elderly + children + disability vs total pop + housing condition
  const vulPopRatio = (h.elderlyCount + h.childrenCount + h.disabilityCount) / h.population;
  const vulPopScore = Math.min(100, vulPopRatio * 200); // normalized so 50% = 100 score
  // housing condition is a score 0-100 (where 0 is worst, wait, or 100 is worst? Let's say 100 is best condition, so we invert it for vulnerability)
  const housingVulScore = 100 - h.housingConditionScore;
  const vulnerabilityScore = (vulPopScore + housingVulScore) / 2;

  // responseGap: average of road and evacuation (assuming 100 is best access, so 100 - average = gap)
  const responseGapScore = 100 - ((h.roadAccessScore + h.evacuationAccessScore) / 2);

  const finalRiskScore =
    hazardScore * weights.hazard +
    exposureScore * weights.exposure +
    vulnerabilityScore * weights.vulnerability +
    responseGapScore * weights.responseGap;

  let redZoneCategory = "Green";
  let relocationCategory = "Monitor / Mitigate";

  if (finalRiskScore >= 75) {
    redZoneCategory = "Red";
    relocationCategory = "Immediate Relocation";
  } else if (finalRiskScore >= 55) {
    redZoneCategory = "Orange";
    relocationCategory = "Short-Term Relocation";
  } else if (finalRiskScore >= 35) {
    redZoneCategory = "Yellow";
    relocationCategory = "Medium-Term Monitoring";
  }

  const explanations = [];
  explanations.push(`Hazard contribution is ${Math.round(hazardScore)}/100.`);
  explanations.push(`Exposure contribution is ${Math.round(exposureScore)}/100 based on ${h.households} households.`);
  explanations.push(`Vulnerability contribution is ${Math.round(vulnerabilityScore)}/100 due to demographics and housing.`);
  explanations.push(`Response-access gap is ${Math.round(responseGapScore)}/100.`);
  explanations.push(`${relocationCategory} is recommended with a final risk score of ${Math.round(finalRiskScore)}/100.`);

  return {
    ...h,
    hazardScore,
    exposureScore,
    vulnerabilityScore,
    responseGapScore,
    finalRiskScore,
    redZoneCategory,
    relocationCategory,
    relocationStatus: "Pending Validation",
    explanation: explanations.join(" "),
  };
}
