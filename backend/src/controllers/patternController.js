import { scanCandlePatterns } from '../services/candlePatternService.js';
import { scanChartPatterns } from '../services/chartPatternService.js';
import { getTheStratPatternCatalog, scanTheStratPatterns } from '../services/theStratPatternService.js';

export const scanAllPatterns = async (req, res) => {
  try {
    const { data, window } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid K-line data'
      });
    }

    const candlePatterns = scanCandlePatterns(data);
    const chartPatterns = scanChartPatterns(data, window);
    const theStratPatterns = scanTheStratPatterns(data);

    res.json({
      success: true,
      data: {
        candlePatterns: {
          count: candlePatterns.length,
          patterns: candlePatterns
        },
        chartPatterns: {
          count: chartPatterns.length,
          patterns: chartPatterns
        },
        theStratPatterns: {
          count: theStratPatterns.length,
          patterns: theStratPatterns
        },
        total: candlePatterns.length + chartPatterns.length + theStratPatterns.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const scanTheStrat = async (req, res) => {
  try {
    const { data, patternType } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid K-line data'
      });
    }

    const patterns = scanTheStratPatterns(data);
    const filteredPatterns = patternType
      ? patterns.filter(item => item.pattern.type === patternType || item.pattern.name === patternType)
      : patterns;

    res.json({
      success: true,
      data: {
        count: filteredPatterns.length,
        patterns: filteredPatterns,
        catalog: getTheStratPatternCatalog()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
