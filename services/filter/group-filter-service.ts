import { IGroup } from '../../interfaces/IGroup';
import { MemberRole } from '../../enums';

export interface GroupFilters {
  levelRange?: string;
  dungeon?: string;
  role?: MemberRole;
}

export interface LevelRange {
  min: number;
  max: number;
}

/**
 * Service to handle group filtering logic
 */
export class GroupFilterService {
  /**
   * Parse level range string into min/max values
   * Supports formats: "0", "1-5", "6-9", "10", "11", "12+", "custom:3-7"
   */
  static parseLevelRange(levelRange: string): LevelRange | null {
    try {
      // Handle predefined ranges
      switch (levelRange) {
        case '0':
          return { min: 0, max: 0 };
        case '1-5':
          return { min: 1, max: 5 };
        case '6-9':
          return { min: 6, max: 9 };
        case '10':
          return { min: 10, max: 10 };
        case '11':
          return { min: 11, max: 11 };
        case '12+':
          return { min: 12, max: 20 }; // Assuming max level is 20
        default:
          // Handle custom range format: "custom:3-7"
          if (levelRange.startsWith('custom:')) {
            const rangePart = levelRange.substring(7); // Remove "custom:" prefix
            const [minStr, maxStr] = rangePart.split('-');
            
            if (!minStr || !maxStr) {
              return null;
            }
            
            const min = parseInt(minStr.trim());
            const max = parseInt(maxStr.trim());
            
            if (isNaN(min) || isNaN(max) || min < 0 || max < min || max > 20) {
              return null;
            }
            
            return { min, max };
          }
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a group's dungeon level matches the specified range
   */
  static matchesLevelRange(group: IGroup, levelRange: LevelRange): boolean {
    if (!group.dungeon?.level) {
      return false;
    }

    const groupLevel = typeof group.dungeon.level === 'string' 
      ? parseInt(group.dungeon.level) 
      : group.dungeon.level;

    if (isNaN(groupLevel)) {
      return false;
    }

    return groupLevel >= levelRange.min && groupLevel <= levelRange.max;
  }

  /**
   * Check if a group's dungeon name matches the filter
   */
  static matchesDungeonName(group: IGroup, dungeonFilter: string): boolean {
    if (!group.dungeon?.name) {
      return false;
    }

    return group.dungeon.name.toLowerCase().includes(dungeonFilter.toLowerCase());
  }

  /**
   * Check if a group has open slots for the specified role
   */
  static hasOpenRoleSlot(group: IGroup, role: MemberRole): boolean {
    const members = group.members || [];
    const roleCount = members.filter(m => m.role === role).length;

    switch (role) {
      case MemberRole.Tank:
        return roleCount < 1;
      case MemberRole.Healer:
        return roleCount < 1;
      case MemberRole.Dps:
        return roleCount < 3;
      default:
        return false;
    }
  }

  /**
   * Apply all filters to a list of groups
   */
  static filterGroups(groups: IGroup[], filters: GroupFilters): IGroup[] {
    return groups.filter(group => {
      // Level range filter
      if (filters.levelRange) {
        const levelRange = this.parseLevelRange(filters.levelRange);
        if (!levelRange || !this.matchesLevelRange(group, levelRange)) {
          return false;
        }
      }

      // Dungeon name filter
      if (filters.dungeon) {
        if (!this.matchesDungeonName(group, filters.dungeon)) {
          return false;
        }
      }

      // Role availability filter
      if (filters.role) {
        if (!this.hasOpenRoleSlot(group, filters.role)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get available level range options for command choices
   */
  static getLevelRangeChoices() {
    return [
      { name: 'Level 0', value: '0' },
      { name: 'Levels 1-5', value: '1-5' },
      { name: 'Levels 6-9', value: '6-9' },
      { name: 'Level 10', value: '10' },
      { name: 'Level 11', value: '11' },
      { name: 'Level 12+', value: '12+' },
    ];
  }

  /**
   * Get available role options for command choices
   */
  static getRoleChoices() {
    return [
      { name: '🛡️ Tank', value: MemberRole.Tank },
      { name: '💚 Healer', value: MemberRole.Healer },
      { name: '⚔️ DPS', value: MemberRole.Dps },
    ];
  }

  /**
   * Validate custom level range format
   */
  static validateCustomLevelRange(input: string): boolean {
    if (!input.startsWith('custom:')) {
      return false;
    }

    const rangePart = input.substring(7);
    const [minStr, maxStr] = rangePart.split('-');
    
    if (!minStr || !maxStr) {
      return false;
    }
    
    const min = parseInt(minStr.trim());
    const max = parseInt(maxStr.trim());
    
    return !isNaN(min) && !isNaN(max) && min >= 0 && max >= min && max <= 20;
  }

  /**
   * Format level range for display
   */
  static formatLevelRange(levelRange: string): string {
    const parsed = this.parseLevelRange(levelRange);
    if (!parsed) {
      return levelRange;
    }

    if (parsed.min === parsed.max) {
      return `Level ${parsed.min}`;
    } else if (parsed.max === 20) {
      return `Level ${parsed.min}+`;
    } else {
      return `Levels ${parsed.min}-${parsed.max}`;
    }
  }
}
