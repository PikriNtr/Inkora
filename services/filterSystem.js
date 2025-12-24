/**
 * Filter System - Inspired by Mihon's FilterList and Filter classes
 * Provides advanced filtering for manga sources
 */

/**
 * Filter types
 */
export const FilterType = {
  HEADER: 'header',
  SEPARATOR: 'separator',
  TEXT: 'text',
  CHECKBOX: 'checkbox',
  SELECT: 'select',
  SORT: 'sort',
  GROUP: 'group',
  TRISTATE: 'tristate',
};

/**
 * Tristate values for filters
 */
export const TriState = {
  DISABLED: 0,
  EXCLUDED: 1,
  INCLUDED: 2,
};

/**
 * Base Filter class
 */
class Filter {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }

  toQuery() {
    return {};
  }
}

/**
 * Header filter (just displays text)
 */
export class HeaderFilter extends Filter {
  constructor(name) {
    super(name, FilterType.HEADER);
  }
}

/**
 * Separator filter (visual separator)
 */
export class SeparatorFilter extends Filter {
  constructor() {
    super('', FilterType.SEPARATOR);
  }
}

/**
 * Text filter (search input)
 */
export class TextFilter extends Filter {
  constructor(name, placeholder = '') {
    super(name, FilterType.TEXT);
    this.value = '';
    this.placeholder = placeholder;
  }

  setValue(value) {
    this.value = value;
  }

  toQuery() {
    return this.value ? { [this.name.toLowerCase()]: this.value } : {};
  }
}

/**
 * Checkbox filter
 */
export class CheckboxFilter extends Filter {
  constructor(name, defaultValue = false) {
    super(name, FilterType.CHECKBOX);
    this.checked = defaultValue;
  }

  setChecked(checked) {
    this.checked = checked;
  }

  toQuery() {
    return { [this.name.toLowerCase()]: this.checked };
  }
}

/**
 * Select filter (dropdown)
 */
export class SelectFilter extends Filter {
  constructor(name, options, defaultIndex = 0) {
    super(name, FilterType.SELECT);
    this.options = options;
    this.selectedIndex = defaultIndex;
  }

  setSelected(index) {
    if (index >= 0 && index < this.options.length) {
      this.selectedIndex = index;
    }
  }

  getSelected() {
    return this.options[this.selectedIndex];
  }

  toQuery() {
    const selected = this.getSelected();
    return selected ? { [this.name.toLowerCase()]: selected.value || selected } : {};
  }
}

/**
 * Sort filter
 */
export class SortFilter extends Filter {
  constructor(name, options, defaultSort = null) {
    super(name, FilterType.SORT);
    this.options = options;
    this.selected = defaultSort || (options.length > 0 ? options[0] : null);
    this.ascending = true;
  }

  setSort(option, ascending = true) {
    this.selected = option;
    this.ascending = ascending;
  }

  toQuery() {
    if (!this.selected) return {};
    
    return {
      sort: this.selected.value || this.selected,
      order: this.ascending ? 'asc' : 'desc',
    };
  }
}

/**
 * Tristate filter (exclude/include/disabled)
 */
export class TriStateFilter extends Filter {
  constructor(name, defaultState = TriState.DISABLED) {
    super(name, FilterType.TRISTATE);
    this.state = defaultState;
  }

  setState(state) {
    if (Object.values(TriState).includes(state)) {
      this.state = state;
    }
  }

  cycle() {
    const states = [TriState.DISABLED, TriState.EXCLUDED, TriState.INCLUDED];
    const currentIndex = states.indexOf(this.state);
    this.state = states[(currentIndex + 1) % states.length];
  }

  toQuery() {
    if (this.state === TriState.DISABLED) return {};
    
    return {
      [this.name.toLowerCase()]: this.state === TriState.INCLUDED ? 'include' : 'exclude',
    };
  }
}

/**
 * Group filter (contains multiple filters)
 */
export class GroupFilter extends Filter {
  constructor(name, filters) {
    super(name, FilterType.GROUP);
    this.filters = filters;
  }

  toQuery() {
    const query = {};
    this.filters.forEach(filter => {
      Object.assign(query, filter.toQuery());
    });
    return query;
  }
}

/**
 * Filter list container
 * Similar to Mihon's FilterList
 */
export class FilterList {
  constructor(filters = []) {
    this.filters = filters;
  }

  add(filter) {
    this.filters.push(filter);
  }

  remove(filter) {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
    }
  }

  get(index) {
    return this.filters[index];
  }

  getByName(name) {
    return this.filters.find(f => f.name === name);
  }

  toQuery() {
    const query = {};
    this.filters.forEach(filter => {
      Object.assign(query, filter.toQuery());
    });
    return query;
  }

  reset() {
    this.filters.forEach(filter => {
      if (filter.type === FilterType.TEXT) {
        filter.setValue('');
      } else if (filter.type === FilterType.CHECKBOX) {
        filter.setChecked(false);
      } else if (filter.type === FilterType.SELECT) {
        filter.setSelected(0);
      } else if (filter.type === FilterType.TRISTATE) {
        filter.setState(TriState.DISABLED);
      } else if (filter.type === FilterType.GROUP) {
        filter.filters.forEach(f => {
          if (f.reset) f.reset();
        });
      }
    });
  }

  size() {
    return this.filters.length;
  }

  isEmpty() {
    return this.filters.length === 0;
  }
}

/**
 * Common filter builders for manga sources
 */
export const CommonFilters = {
  /**
   * Create genre filters
   */
  createGenreFilters(genres) {
    return genres.map(genre => new TriStateFilter(genre));
  },

  /**
   * Create status filter
   */
  createStatusFilter() {
    return new SelectFilter('Status', [
      { label: 'All', value: '' },
      { label: 'Ongoing', value: 'ongoing' },
      { label: 'Completed', value: 'completed' },
      { label: 'Hiatus', value: 'hiatus' },
      { label: 'Cancelled', value: 'cancelled' },
    ]);
  },

  /**
   * Create sort filter
   */
  createSortFilter() {
    return new SortFilter('Sort', [
      { label: 'Latest Updated', value: 'updated' },
      { label: 'Latest Added', value: 'added' },
      { label: 'Popular', value: 'popular' },
      { label: 'Rating', value: 'rating' },
      { label: 'Title', value: 'title' },
    ]);
  },

  /**
   * Create content rating filters
   */
  createContentRatingFilters() {
    return new GroupFilter('Content Rating', [
      new CheckboxFilter('Safe', true),
      new CheckboxFilter('Suggestive', true),
      new CheckboxFilter('Erotica', false),
      new CheckboxFilter('Pornographic', false),
    ]);
  },

  /**
   * Create demographic filters
   */
  createDemographicFilters() {
    return new SelectFilter('Demographic', [
      { label: 'All', value: '' },
      { label: 'Shounen', value: 'shounen' },
      { label: 'Shoujo', value: 'shoujo' },
      { label: 'Seinen', value: 'seinen' },
      { label: 'Josei', value: 'josei' },
    ]);
  },

  /**
   * Create publication status filter
   */
  createPublicationStatusFilter() {
    return new GroupFilter('Publication Status', [
      new CheckboxFilter('Ongoing'),
      new CheckboxFilter('Completed'),
      new CheckboxFilter('Hiatus'),
      new CheckboxFilter('Cancelled'),
    ]);
  },

  /**
   * Create year filter
   */
  createYearFilter() {
    const currentYear = new Date().getFullYear();
    const years = [{ label: 'All', value: '' }];
    
    for (let year = currentYear; year >= 1950; year--) {
      years.push({ label: year.toString(), value: year.toString() });
    }
    
    return new SelectFilter('Year', years);
  },
};

/**
 * MangaDex specific filters
 */
export const createMangaDexFilters = () => {
  const filters = new FilterList();

  filters.add(new HeaderFilter('Search'));
  filters.add(new TextFilter('Title', 'Enter manga title...'));
  filters.add(new TextFilter('Author', 'Enter author name...'));
  filters.add(new SeparatorFilter());

  filters.add(new HeaderFilter('Filters'));
  filters.add(CommonFilters.createStatusFilter());
  filters.add(CommonFilters.createDemographicFilters());
  filters.add(CommonFilters.createContentRatingFilters());
  filters.add(new SeparatorFilter());

  filters.add(new HeaderFilter('Sort'));
  filters.add(CommonFilters.createSortFilter());
  filters.add(new SeparatorFilter());

  filters.add(new HeaderFilter('Genres'));
  const genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
    'Horror', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi',
    'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
  ];
  filters.add(new GroupFilter('Genres', CommonFilters.createGenreFilters(genres)));

  return filters;
};

/**
 * Bato specific filters
 */
export const createBatoFilters = () => {
  const filters = new FilterList();

  filters.add(new HeaderFilter('Search'));
  filters.add(new TextFilter('Query', 'Enter manga title...'));
  filters.add(new SeparatorFilter());

  filters.add(new HeaderFilter('Filters'));
  filters.add(CommonFilters.createStatusFilter());
  filters.add(new SeparatorFilter());

  filters.add(new HeaderFilter('Sort'));
  filters.add(new SortFilter('Sort', [
    { label: 'Latest', value: 'update' },
    { label: 'Popular', value: 'popular' },
    { label: 'Views', value: 'views' },
  ]));

  return filters;
};

/**
 * Apply filters to a query URL
 */
export const applyFiltersToUrl = (baseUrl, filters) => {
  const query = filters.toQuery();
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};
