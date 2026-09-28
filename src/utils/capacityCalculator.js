export function calculateSiteSuitabilityAndCapacity(site) {
  // Wait, user instructions say suitabilityScore = ...
  const suitabilityScore = 
    (site.hazardSafetyScore * 0.30) + 
    (site.roadAccessScore * 0.20) + 
    (site.waterAvailabilityScore * 0.15) + 
    (site.livelihoodAccessScore * 0.15) + 
    (site.legalFeasibilityScore * 0.10) + 
    // user said healthAccessScore, let's map distanceToHospital to a score (e.g. 0km = 100, >20km = 0)
    (Math.max(0, 100 - (site.distanceToHospitalKm * 5)) * 0.10);

  let siteStatus = "Unavailable";
  if (suitabilityScore >= 80) siteStatus = "Recommended";
  else if (suitabilityScore >= 60) siteStatus = "Conditional";
  else if (suitabilityScore >= 40) siteStatus = "Temporary Only";

  const capacities = [
    { name: "Land", val: site.landCapacity },
    { name: "Housing", val: site.housingCapacity },
    { name: "Water", val: site.waterCapacity },
    { name: "Sanitation", val: site.sanitationCapacity },
    { name: "Road", val: site.roadCapacity },
    { name: "Health", val: site.healthCapacity }
  ];

  let finalCapacity = site.landCapacity;
  let limitingFactor = "Land";

  capacities.forEach(c => {
    if (c.val < finalCapacity) {
      finalCapacity = c.val;
      limitingFactor = c.name;
    }
  });

  const availableCapacity = finalCapacity - site.occupiedCapacity;
  const utilizationPercentage = (site.occupiedCapacity / finalCapacity) * 100;
  const familyCapacity = Math.floor(availableCapacity / 4); // 4 people per family

  return {
    ...site,
    suitabilityScore,
    siteStatus,
    finalCapacity,
    availableCapacity,
    utilizationPercentage,
    limitingFactor: `${limitingFactor} capacity is the limiting factor`,
    familyCapacity,
  };
}
