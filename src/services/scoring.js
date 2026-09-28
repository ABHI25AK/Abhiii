import rawData from '../data/seed_data.json';

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const toRad = x => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateSiteSuitability(site) {
    const land_score = (site.land_availability || 0) * 0.3;
    const water_score = (site.water_access || 0) * 0.3;
    const dist = site.distance_to_services || 0;
    const dist_score_raw = Math.max(0, 100 - (dist * 2));
    const dist_score = dist_score_raw * 0.4;
    const base_score = land_score + water_score + dist_score;
    const penalty = site.ecological_risk_flag ? 50 : 0;
    const final_score = Math.max(0, Math.min(100, base_score - penalty));
    return {
        final_score: Number(final_score.toFixed(1)),
        breakdown: {
            land_score_contribution: Number(land_score.toFixed(1)),
            water_score_contribution: Number(water_score.toFixed(1)),
            services_score_contribution: Number(dist_score.toFixed(1)),
            ecological_penalty: penalty
        }
    };
}

function calculateHabitationPriority(habitation) {
    const hazard_exposure = habitation.current_hazard_exposure || 0;
    const history_score = Math.min(20, (habitation.hazard_history || 0) * 10);
    const pop = habitation.population || 0;
    const pop_score = Math.min(30, (pop / 1000) * 10);
    const raw_priority = (hazard_exposure * 0.5) + history_score + pop_score;
    const final_priority = Math.min(100, raw_priority);
    let tier = "Green";
    if (final_priority > 75) tier = "Red";
    else if (final_priority > 50) tier = "Yellow";
    return {
        priority_score: Number(final_priority.toFixed(1)),
        tier: tier,
        breakdown: {
            hazard_base: Number((hazard_exposure * 0.5).toFixed(1)),
            history_factor: Number(history_score.toFixed(1)),
            population_factor: Number(pop_score.toFixed(1))
        }
    };
}

export function getDashboardData(rainfallMultiplier = 1.0) {
    const data = JSON.parse(JSON.stringify(rawData));
    const sites_scored = data.candidate_sites.map(site => {
        site.suitability = calculateSiteSuitability(site);
        return site;
    });
    const habitations_scored = data.habitations.map(hab => {
        const original_exposure = hab.current_hazard_exposure;
        hab.current_hazard_exposure = Math.min(100, original_exposure * rainfallMultiplier);
        hab.priority = calculateHabitationPriority(hab);
        const recommendations = sites_scored.map(site => {
            const dist_km = haversine(hab.lat, hab.lng, site.lat, site.lng);
            const dist_score = Math.max(0, 100 - (dist_km * 5));
            const combined_match = (site.suitability.final_score * 0.6) + (dist_score * 0.4);
            return {
                site_id: site.id,
                site_name: site.name,
                distance_km: Number(dist_km.toFixed(2)),
                match_score: Number(combined_match.toFixed(1)),
                suitability_breakdown: site.suitability
            };
        });
        recommendations.sort((a, b) => b.match_score - a.match_score);
        hab.recommended_sites = recommendations.slice(0, 3);
        hab.simulated_hazard_exposure = Number(hab.current_hazard_exposure.toFixed(1));
        hab.current_hazard_exposure = original_exposure;
        return hab;
    });
    return {
        district: data.district,
        red_zones: data.red_zones || [],
        habitations: habitations_scored,
        candidate_sites: sites_scored
    };
}
