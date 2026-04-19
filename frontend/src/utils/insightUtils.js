/**
 * Smart Cost Insights Utilities (JavaScript/Frontend)
 * 
 * Provides client-side helper functions for cost analysis and insights.
 * Pairs with backend insight_service.py for comprehensive analytics.
 */

// Constants
const INSIGHTS_CONFIG = {
  MIN_PERCENTAGE_CHANGE: 15,
  MIN_COST_DIFFERENCE: 100,
  MIN_COST_AMOUNT: 10,
  SPIKE_MULTIPLIER: 1.5,
  TOP_INSIGHTS_LIMIT: 3,
  SEVERITY_THRESHOLDS: {
    HIGH: 50,
    MEDIUM: 20,
    MEDIUM_COST: 200,
    HIGH_COST: 500
  }
};

/**
 * Calculate percentage change between two values
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @returns {number} Percentage change
 */
export const getPercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate total cost for a period, optionally filtered by service
 * @param {Array} costsData - Array of cost records
 * @param {string} service - Optional service filter
 * @returns {number} Total cost
 */
export const calculatePeriodCost = (costsData, service = null) => {
  return costsData.reduce((total, record) => {
    if (!record.cost || record.cost < 0) return total;
    
    if (service && record.service?.toLowerCase() !== service.toLowerCase()) {
      return total;
    }
    
    return total + parseFloat(record.cost);
  }, 0);
};

/**
 * Split cost data into current and previous periods
 * @param {Array} costData - Cost records with date field (YYYY-MM-DD)
 * @param {number} days - Number of days per period
 * @returns {Object} { currentData, previousData }
 */
export const splitIntoPeriods = (costData, days) => {
  if (!costData || costData.length < 2) {
    return { currentData: costData, previousData: [] };
  }

  try {
    // Get unique dates
    const dates = [...new Set(costData.map(r => r.date))].sort();
    
    if (dates.length < days) {
      return { currentData: costData, previousData: [] };
    }

    const splitIndex = dates.length - days;
    const splitDate = dates[splitIndex];
    
    const current = costData.filter(r => r.date >= splitDate);
    const previous = costData.filter(
      r => r.date < splitDate && r.date >= (dates[Math.max(0, splitIndex - days)] || '')
    );

    return { currentData: current, previousData: previous };
  } catch (error) {
    console.error('Error splitting periods:', error);
    return { currentData: costData, previousData: [] };
  }
};

/**
 * Detect cost spikes in daily data
 * Spike = day where cost > (average * SPIKE_MULTIPLIER)
 * @param {Array} costData - Cost records with date and cost
 * @param {string} service - Optional service filter
 * @returns {Array} Spike records
 */
export const detectSpikes = (costData, service = null) => {
  const spikes = [];
  
  let filtered = costData;
  if (service) {
    filtered = costData.filter(r => r.service?.toLowerCase() === service.toLowerCase());
  }

  if (!filtered || filtered.length < 3) {
    return spikes;
  }

  // Calculate average (excluding highest outlier)
  const costs = filtered
    .filter(r => r.cost >= INSIGHTS_CONFIG.MIN_COST_AMOUNT)
    .map(r => parseFloat(r.cost))
    .sort((a, b) => a - b);

  if (costs.length === 0) return spikes;

  const average = costs.length > 1 
    ? costs.slice(0, -1).reduce((a, b) => a + b, 0) / (costs.length - 1)
    : costs[0];

  const threshold = average * INSIGHTS_CONFIG.SPIKE_MULTIPLIER;

  // Find spikes
  return filtered
    .filter(r => r.cost >= threshold)
    .map(r => ({
      date: r.date,
      service: r.service || 'Unknown',
      cost: r.cost,
      average: average,
      excess: r.cost - average
    }))
    .sort((a, b) => b.cost - a.cost);
};

/**
 * Calculate severity level
 * @param {number} percentageChange - Percentage change value
 * @param {number} costDifference - Absolute cost difference
 * @returns {string} 'high', 'medium', or 'low'
 */
export const calculateSeverity = (percentageChange, costDifference) => {
  const absPercentage = Math.abs(percentageChange);
  
  if (absPercentage > INSIGHTS_CONFIG.SEVERITY_THRESHOLDS.HIGH || 
      costDifference > INSIGHTS_CONFIG.SEVERITY_THRESHOLDS.HIGH_COST) {
    return 'high';
  }
  
  if (absPercentage >= INSIGHTS_CONFIG.SEVERITY_THRESHOLDS.MEDIUM || 
      costDifference > INSIGHTS_CONFIG.SEVERITY_THRESHOLDS.MEDIUM_COST) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * Calculate confidence score
 * @param {number} dataPoints - Number of records
 * @param {number} consistency - Coefficient of variation (0-1)
 * @returns {number} Confidence score (0-100)
 */
export const calculateConfidenceScore = (dataPoints, consistency = 0.5) => {
  const pointScore = Math.min((dataPoints / 30) * 100, 80);
  const consistencyScore = Math.max((1 - Math.min(consistency, 1)) * 20, 0);
  return Math.min(pointScore + consistencyScore, 100);
};

/**
 * Analyze region contribution to cost change
 * @param {Array} currentData - Current period data
 * @param {Array} previousData - Previous period data
 * @param {string} service - Service name
 * @returns {Object} { region, contribution }
 */
export const analyzeRegionContribution = (currentData, previousData, service) => {
  const currentByRegion = {};
  const previousByRegion = {};

  currentData.forEach(record => {
    if (record.service?.toLowerCase() === service.toLowerCase()) {
      const region = record.region || 'unknown';
      currentByRegion[region] = (currentByRegion[region] || 0) + parseFloat(record.cost || 0);
    }
  });

  previousData.forEach(record => {
    if (record.service?.toLowerCase() === service.toLowerCase()) {
      const region = record.region || 'unknown';
      previousByRegion[region] = (previousByRegion[region] || 0) + parseFloat(record.cost || 0);
    }
  });

  if (Object.keys(currentByRegion).length === 0) {
    return { region: null, contribution: 0 };
  }

  let maxIncrease = 0;
  let topRegion = null;

  Object.keys(currentByRegion).forEach(region => {
    const current = currentByRegion[region];
    const previous = previousByRegion[region] || 0;
    const increase = current - previous;

    if (increase > maxIncrease) {
      maxIncrease = increase;
      topRegion = region;
    }
  });

  const totalChange = Object.values(currentByRegion).reduce((a, b) => a + b, 0) -
                      Object.values(previousByRegion).reduce((a, b) => a + b, 0);

  const contribution = totalChange !== 0 
    ? (maxIncrease / Math.abs(totalChange)) * 100
    : 0;

  return { region: topRegion, contribution };
};

/**
 * Generate root cause explanation
 * @param {Array} currentData - Current period data
 * @param {Array} previousData - Previous period data
 * @param {string} service - Service name
 * @param {string} changeType - 'increase', 'decrease', or 'spike'
 * @returns {string} Root cause explanation
 */
export const getRootCause = (currentData, previousData, service, changeType) => {
  if (changeType === 'increase') {
    const { region } = analyzeRegionContribution(currentData, previousData, service);
    if (region && region.toLowerCase() !== 'unknown') {
      return `mainly driven by ${region}`;
    }
    return 'likely due to increased usage or new resources';
  }

  if (changeType === 'decrease') {
    return 'due to reduced usage or removed resources';
  }

  if (changeType === 'spike') {
    return 'temporary spike detected in usage';
  }

  return 'cost change detected';
};

/**
 * Generate insights from cost data (Client-side version)
 * Note: Backend version is more comprehensive. Use this for lightweight calculations.
 * @param {Array} costData - Cost records
 * @param {number} periodDays - Days for comparison (default: 7)
 * @returns {Array} Insights array
 */
export const generateQuickInsights = (costData, periodDays = 7) => {
  if (!costData || costData.length < 2) {
    return [];
  }

  const insights = [];

  try {
    const { currentData, previousData } = splitIntoPeriods(costData, periodDays);

    if (!currentData.length || !previousData.length) {
      return [];
    }

    // Get unique services
    const services = [...new Set(costData.map(r => r.service).filter(Boolean))];

    // Generate insights for each service
    services.forEach(service => {
      const currentCost = calculatePeriodCost(currentData, service);
      const previousCost = calculatePeriodCost(previousData, service);

      if (currentCost < INSIGHTS_CONFIG.MIN_COST_AMOUNT && 
          previousCost < INSIGHTS_CONFIG.MIN_COST_AMOUNT) {
        return;
      }

      if (currentCost === previousCost) return;

      const percentageChange = getPercentageChange(currentCost, previousCost);
      const costDifference = currentCost - previousCost;

      if (Math.abs(percentageChange) < INSIGHTS_CONFIG.MIN_PERCENTAGE_CHANGE && 
          Math.abs(costDifference) < INSIGHTS_CONFIG.MIN_COST_DIFFERENCE) {
        return;
      }

      const insightType = costDifference > 0 ? 'increase' : 'decrease';
      const rootCause = getRootCause(currentData, previousData, service, insightType);

      const message = 
        `${service} cost ${insightType === 'increase' ? 'increased' : 'decreased'} by ` +
        `${Math.abs(percentageChange.toFixed(1))}% compared to previous ${periodDays} days, ${rootCause}`;

      insights.push({
        type: insightType,
        service,
        message,
        severity: calculateSeverity(percentageChange, Math.abs(costDifference)),
        confidence: calculateConfidenceScore(currentData.length + previousData.length, 0.5),
        current_cost: Math.round(currentCost * 100) / 100,
        previous_cost: Math.round(previousCost * 100) / 100,
        percentage_change: Math.round(percentageChange * 100) / 100,
        cost_difference: Math.round(costDifference * 100) / 100
      });
    });

    // Add spike insights
    const allSpikes = [];
    services.forEach(service => {
      detectSpikes(currentData, service).slice(0, 1).forEach(spike => {
        allSpikes.push({
          type: 'spike',
          service: spike.service,
          message: `Cost spike detected on ${spike.date} for ${service}: ₹${spike.excess.toFixed(2)} higher than average`,
          severity: spike.excess > 200 ? 'high' : 'medium',
          confidence: 85,
          spike_cost: Math.round(spike.cost * 100) / 100,
          average_cost: Math.round(spike.average * 100) / 100,
          excess: Math.round(spike.excess * 100) / 100
        });
      });
    });

    insights.push(...allSpikes);

  } catch (error) {
    console.error('Error generating quick insights:', error);
  }

  // Sort by severity and impact
  const severityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return Math.abs(b.cost_difference || 0) - Math.abs(a.cost_difference || 0);
  });

  return insights.slice(0, INSIGHTS_CONFIG.TOP_INSIGHTS_LIMIT);
};

/**
 * Format insights for display
 * @param {Array} insights - Insights array
 * @param {string} format - 'full' or 'summary'
 * @returns {Array} Formatted insights
 */
export const formatInsights = (insights, format = 'full') => {
  if (format === 'summary') {
    return insights.map(insight => ({
      type: insight.type,
      service: insight.service,
      message: insight.message,
      severity: insight.severity
    }));
  }

  return insights;
};

/**
 * Get insights summary
 * @param {Array} insights - Insights array
 * @returns {Object} Summary statistics
 */
export const getInsightsSummary = (insights) => {
  const severityCounts = { high: 0, medium: 0, low: 0 };
  const typeCounts = {};
  let totalCostImpact = 0;

  insights.forEach(insight => {
    severityCounts[insight.severity] = (severityCounts[insight.severity] || 0) + 1;
    typeCounts[insight.type] = (typeCounts[insight.type] || 0) + 1;
    totalCostImpact += Math.abs(insight.cost_difference || 0);
  });

  return {
    total_insights: insights.length,
    by_severity: severityCounts,
    by_type: typeCounts,
    total_cost_impact: Math.round(totalCostImpact * 100) / 100,
    top_service_affected: insights[0]?.service || null
  };
};
