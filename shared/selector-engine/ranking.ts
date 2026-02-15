/**
 * Selector Ranking Engine
 * Ranks selectors by stability, maintainability, and performance
 */

export interface SelectorScore {
  selector: string;
  score: number;
  factors: {
    stability: number;
    specificity: number;
    maintainability: number;
    performance: number;
  };
  recommendation: 'excellent' | 'good' | 'acceptable' | 'poor';
}

export class SelectorRankingEngine {
  rankSelectors(selectors: string[]): SelectorScore[] {
    return selectors.map(selector => {
      const factors = this.calculateFactors(selector);
      const score = this.calculateOverallScore(factors);
      
      return {
        selector,
        score,
        factors,
        recommendation: this.getRecommendation(score),
      };
    });
  }

  private calculateFactors(selector: string) {
    return {
      stability: this.calculateStability(selector),
      specificity: this.calculateSpecificity(selector),
      maintainability: this.calculateMaintainability(selector),
      performance: this.calculatePerformance(selector),
    };
  }

  private calculateStability(selector: string): number {
    if (selector.includes('[data-testid=')) return 100;
    if (selector.startsWith('role=')) return 90;
    if (selector.includes('[aria-label=')) return 80;
    if (selector.match(/^text=/)) return 70;
    if (selector.match(/^\./)) return 40; // CSS class
    if (selector.match(/^#/)) return 30; // CSS ID
    if (selector.includes('nth-child')) return 20;
    return 50;
  }

  private calculateSpecificity(selector: string): number {
    const parts = selector.split(' ').length;
    return Math.max(0, 100 - (parts * 10));
  }

  private calculateMaintainability(selector: string): number {
    if (selector.includes('[data-testid=')) return 100;
    if (selector.length < 50) return 80;
    if (selector.length < 100) return 60;
    return 40;
  }

  private calculatePerformance(selector: string): number {
    if (selector.match(/^#/)) return 100; // ID
    if (selector.includes('[data-testid=')) return 90;
    if (selector.match(/^\./)) return 70; // Class
    if (selector.includes('//')) return 30; // XPath
    return 60;
  }

  private calculateOverallScore(factors: any): number {
    const weights = {
      stability: 0.4,
      specificity: 0.2,
      maintainability: 0.25,
      performance: 0.15,
    };

    return Object.keys(weights).reduce((sum, key) => {
      return sum + factors[key] * weights[key as keyof typeof weights];
    }, 0);
  }

  private getRecommendation(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'acceptable';
    return 'poor';
  }
}
