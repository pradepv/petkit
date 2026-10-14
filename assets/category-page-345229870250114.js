import { zcAdapter } from './network-adapter-730892702895239.js';
(() => {
  const root = document.querySelector('[data-category-page]');

  if (!root) return;

  const sortParam = root.dataset.sortParam;
  const mobilePanel = root.querySelector('[data-mobile-panel]');
  const mobileOverlay = root.querySelector('[data-mobile-overlay]');
  const mobileOpenBtns = root.querySelectorAll('[data-mobile-filter-open]');
  const mobileCloseBtn = root.querySelector('[data-mobile-filter-close]');
  const mobileApplyBtn = root.querySelector('[data-mobile-apply]');
  const mobileResetBtn = root.querySelector('[data-mobile-reset]');
  const mobileSortPanel = root.querySelector('[data-mobile-sort-panel]');
  const mobileSortOverlay = root.querySelector('[data-mobile-sort-overlay]');
  const mobileSortOpenBtns = root.querySelectorAll('[data-mobile-sort-open]');
  const mobileSortCloseBtn = root.querySelector('[data-mobile-sort-close]');

  let draftParams = new URLSearchParams(window.location.search);

  const getCurrentParams = () => new URLSearchParams(window.location.search);

  const filterDataScript = document.querySelector('script.filterData');

  const loaderEl = root.querySelector('[data-filter-loader]');

  const dispatchListingSuccess = (url, container) => {
    if (typeof window.zcDispatchStorefrontEvent !== 'function' || !container) {
      return;
    }
    const productEls = container.querySelectorAll('.product-card, [data-product-card], article');
    window.zcDispatchStorefrontEvent('zc-product-listing-load-success', {
      url: url,
      productCount: productEls.length,
      source: 'category-page',
    });
  };

  const dispatchListingError = (url, reason) => {
    if (typeof window.zcDispatchStorefrontEvent !== 'function') {
      return;
    }
    window.zcDispatchStorefrontEvent('zc-product-listing-load-error', {
      url: url,
      reason: reason,
      source: 'category-page',
    });
  };

  const applyParams = async (params) => {
    const next = new URL(window.location.href);
    next.search = params.toString();
    window.history.pushState({}, '', next.toString());

    const target = root.querySelector('#filterableResults');
    if (!target) {
      return;
    }

    loaderEl?.classList.remove('hidden');

    try {
      const response = await zcAdapter.fetch(next.toString());
      if (!response.ok) {
        dispatchListingError(next.toString(), 'http-' + response.status);
        return;
      }
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newResults = doc.querySelector('#filterableResults');
      if (newResults) {
        target.innerHTML = newResults.innerHTML;
        dispatchListingSuccess(next.toString(), target);
      } else {
        dispatchListingError(next.toString(), 'missing-results');
      }
      const newFilterData = doc.querySelector('script.filterData');
      if (newFilterData && filterDataScript) {
        filterDataScript.textContent = newFilterData.textContent;
      }
      wireRemoveChips();
      syncInputsFromParams('sidebar', new URLSearchParams(next.search));
    } catch (err) {
      dispatchListingError(next.toString(), err && err.message ? String(err.message) : 'fetch-failed');
      window.location.href = next.toString();
    } finally {
      loaderEl?.classList.add('hidden');
    }
  };

  const navigateWithParams = (params) => applyParams(params);

  const updateIconState = (input) => {
    const icon = input.parentElement.querySelector('[data-check-icon]');
    if (!icon) return;

    if (input.checked) {
      icon.classList.remove('hidden');
      icon.classList.add('block');
    } else {
      icon.classList.remove('block');
      icon.classList.add('hidden');
    }
  };

  const syncInputsFromParams = (control, params) => {
    root.querySelectorAll(`[data-filter-input][data-control="${control}"]`).forEach((input) => {
      const param = input.dataset.param;
      const value = input.value;

      if (input.type === 'radio') {
        input.checked = params.get(param) === value;
      } else {
        input.checked = params.getAll(param).includes(value);
      }
      updateIconState(input);
    });
  };

  const setCheckboxParam = (params, param, value, checked) => {
    const values = params.getAll(param).filter((v) => v !== value);
    params.delete(param);

    values.forEach((v) => params.append(param, v));

    if (checked) {
      params.append(param, value);
    }
  };

  const setTriggerExpanded = (trigger, expanded) => {
    if (!trigger) {
      return;
    }
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  const closeAllDropdowns = () => {
    root.querySelectorAll('[id^="filter-dropdown-"]').forEach((dropdown) => {
      dropdown.classList.add('hidden');
    });
    root.querySelectorAll('[data-dropdown-trigger]').forEach((btn) => {
      btn.classList.remove('filter-btn-open');
      setTriggerExpanded(btn, false);
    });

    const sortDropdown = root.querySelector('#sort-dropdown');
    if (sortDropdown) sortDropdown.classList.add('hidden');

    desktopDrafts.clear();
    syncInputsFromParams('desktop', getCurrentParams());
  };

  root.querySelectorAll('[data-dropdown-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const targetId = trigger.dataset.dropdownTrigger;
      const dropdown = root.querySelector(`#${targetId}`);

      if (!dropdown) return;

      const isHidden = dropdown.classList.contains('hidden');
      closeAllDropdowns();
      if (isHidden) {
        dropdown.classList.remove('hidden');
        trigger.classList.add('filter-btn-open');
        setTriggerExpanded(trigger, true);
        const firstFocusable = dropdown.querySelector('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        firstFocusable?.focus();
      }
    });
  });

  document.addEventListener('click', (event) => {
    const clickedTrigger = event.target.closest('[data-dropdown-trigger]');
    const clickedInsideDropdown = event.target.closest('[id^="filter-dropdown-"]') || event.target.closest('#sort-dropdown');

    if (!clickedTrigger && !clickedInsideDropdown) {
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    if (mobilePanel && !mobilePanel.classList.contains('-translate-x-full')) {
      closeMobile();
      return;
    }

    if (mobileSortPanel && !mobileSortPanel.classList.contains('-translate-x-full')) {
      closeMobileSort();
      return;
    }

    const openDesktopDropdown = root.querySelector('[id^="filter-dropdown-"]:not(.hidden)');
    const openSortDropdown = root.querySelector('#sort-dropdown:not(.hidden)');
    if (openDesktopDropdown || openSortDropdown) {
      const trigger = openDesktopDropdown
        ? root.querySelector(`[data-dropdown-trigger="${openDesktopDropdown.id}"]`)
        : root.querySelector('[data-dropdown-trigger="sort-dropdown"]');
      closeAllDropdowns();
      trigger?.focus();
    }
  });

  const desktopDrafts = new Map();

  const desktopDraftFor = (groupParam) => {
    if (!desktopDrafts.has(groupParam)) {
      desktopDrafts.set(groupParam, getCurrentParams());
    }
    return desktopDrafts.get(groupParam);
  };

  root.querySelectorAll('[data-filter-input][data-control="desktop"]').forEach((input) => {
    input.addEventListener('change', () => {
      const param = input.dataset.param;
      const value = input.value;
      if (!param) return;

      const dropdown = input.closest('[id^="filter-dropdown-"]');
      const groupParam = dropdown?.dataset.filterGroup || param;
      const draft = desktopDraftFor(groupParam);
      draft.delete('page');

      if (input.type === 'radio') {
        if (input.checked) {
          draft.set(param, value);
        }
      } else {
        setCheckboxParam(draft, param, value, input.checked);
      }
      updateIconState(input);
    });
  });

  root.querySelectorAll('[data-filter-input][data-control="sidebar"]').forEach((input) => {
    input.addEventListener('change', () => {
      const param = input.dataset.param;
      if (!param) return;

      const params = getCurrentParams();
      params.delete('page');

      if (input.type === 'radio') {
        if (input.checked) params.set(param, input.value);
      } else {
        setCheckboxParam(params, param, input.value, input.checked);
      }
      updateIconState(input);
      navigateWithParams(params);
    });
  });

  root.querySelectorAll('[data-filter-input]').forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      if (input.type === 'radio') {
        if (!input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  root.querySelectorAll('[data-desktop-apply]').forEach((applyBtn) => {
    applyBtn.addEventListener('click', async () => {
      const groupParam = applyBtn.dataset.desktopApply;
      const draft = desktopDrafts.get(groupParam) || getCurrentParams();
      desktopDrafts.delete(groupParam);
      closeAllDropdowns();
      await applyParams(draft);
    });
  });

  root.querySelectorAll('[data-desktop-reset]').forEach((resetBtn) => {
    resetBtn.addEventListener('click', async () => {
      const groupParam = resetBtn.dataset.desktopReset;
      if (!groupParam) {
        return;
      }
      const params = getCurrentParams();
      params.delete('page');
      params.delete(groupParam);
      desktopDrafts.delete(groupParam);
      const dropdown = resetBtn.closest('[id^="filter-dropdown-"]');
      dropdown?.querySelectorAll('[data-filter-input][data-control="desktop"]').forEach((input) => {
        input.checked = false;
        updateIconState(input);
      });
      closeAllDropdowns();
      await applyParams(params);
    });
  });

  const sortByLabel = root.querySelector('[data-sort-trigger-label]')?.textContent.trim().split(':')[0].trim() || 'Sort by';

  const updateSortTriggerLabel = (optionName) => {
    const labelEl = root.querySelector('[data-sort-trigger-label]');
    if (!labelEl) {
      return;
    }
    labelEl.textContent = optionName ? `${sortByLabel} : ${optionName}` : sortByLabel;
  };

  root.querySelectorAll('[data-sort-option]').forEach((optionBtn) => {
    optionBtn.addEventListener('click', () => {
      const value = optionBtn.value;
      const params = getCurrentParams();
      params.delete('page');
      if (sortParam && value) params.set(sortParam, value);

      updateSortTriggerLabel(optionBtn.textContent.trim());
      root.querySelectorAll('[data-sort-option]').forEach((btn) => {
        const isSelected = btn === optionBtn;
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        if (btn.hasAttribute('data-mobile-sort-option')) {
          btn.style.fontWeight = isSelected ? '600' : '400';
        } else {
          btn.style.color = isSelected ? 'var(--color-primary)' : 'var(--color-heading)';
        }
      });
      closeAllDropdowns();

      navigateWithParams(params);
    });
  });

  root.querySelectorAll('[data-clear-group]').forEach((clearBtn) => {
    clearBtn.addEventListener('click', () => {
      const param = clearBtn.dataset.clearGroup;
      if (!param) return;
      const params = getCurrentParams();
      params.delete('page');
      params.delete(param);
      navigateWithParams(params);
    });
  });

  const wireRemoveChips = () => {
    root.querySelectorAll('[data-remove-chip]').forEach((chipBtn) => {
      if (chipBtn.dataset.chipBound) {
        return;
      }
      chipBtn.dataset.chipBound = 'true';
      chipBtn.addEventListener('click', () => {
        const param = chipBtn.dataset.param;
        const value = chipBtn.dataset.value;
        if (!param) return;

        const params = getCurrentParams();
        params.delete('page');

        if (!value) {
          params.delete(param);
        } else {
          const values = params.getAll(param).filter((v) => v !== value);
          params.delete(param);
          values.forEach((v) => params.append(param, v));
        }
        navigateWithParams(params);
      });
    });
  };
  wireRemoveChips();

  let mobileLastFocused = null;

  const openMobile = () => {
    draftParams = getCurrentParams();
    syncInputsFromParams('mobile', draftParams);
    mobileLastFocused = document.activeElement;
    mobileOverlay?.classList.remove('hidden');
    mobileOverlay?.setAttribute('aria-hidden', 'true');
    mobilePanel?.classList.remove('-translate-x-full');
    mobilePanel?.setAttribute('aria-hidden', 'false');
    mobileOpenBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'true'));
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      mobileCloseBtn?.focus();
    });
  };

  const closeMobile = () => {
    mobileOverlay?.classList.add('hidden');
    mobilePanel?.classList.add('-translate-x-full');
    mobilePanel?.setAttribute('aria-hidden', 'true');
    mobileOpenBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
    document.body.style.overflow = '';
    if (mobileLastFocused && typeof mobileLastFocused.focus === 'function') {
      mobileLastFocused.focus();
    }
    mobileLastFocused = null;
  };

  mobileOpenBtns.forEach((btn) => btn.addEventListener('click', openMobile));
  mobileCloseBtn?.addEventListener('click', closeMobile);
  mobileOverlay?.addEventListener('click', closeMobile);

  let mobileSortLastFocused = null;

  const openMobileSort = () => {
    if (!mobileSortPanel) {
      return;
    }
    mobileSortLastFocused = document.activeElement;
    mobileSortOverlay?.classList.remove('hidden');
    mobileSortPanel.classList.remove('-translate-x-full');
    mobileSortPanel.setAttribute('aria-hidden', 'false');
    mobileSortOpenBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'true'));
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => mobileSortCloseBtn?.focus());
  };

  const closeMobileSort = () => {
    if (!mobileSortPanel) {
      return;
    }
    mobileSortOverlay?.classList.add('hidden');
    mobileSortPanel.classList.add('-translate-x-full');
    mobileSortPanel.setAttribute('aria-hidden', 'true');
    mobileSortOpenBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
    document.body.style.overflow = '';
    if (mobileSortLastFocused && typeof mobileSortLastFocused.focus === 'function') {
      mobileSortLastFocused.focus();
    }
    mobileSortLastFocused = null;
  };

  mobileSortOpenBtns.forEach((btn) => btn.addEventListener('click', openMobileSort));
  mobileSortCloseBtn?.addEventListener('click', closeMobileSort);
  mobileSortOverlay?.addEventListener('click', closeMobileSort);

  root.querySelectorAll('[data-mobile-sort-option]').forEach((optionBtn) => {
    optionBtn.addEventListener('click', () => {
      closeMobileSort();
    });
  });

  root.querySelectorAll('[data-filter-input][data-control="mobile"]').forEach((input) => {
    input.addEventListener('change', () => {
      const param = input.dataset.param;
      const value = input.value;

      if (!param) return;

      draftParams.delete('page');

      if (input.type === 'radio') {
        if (input.checked) {
          draftParams.set(param, value);
        }
      } else {
        setCheckboxParam(draftParams, param, value, input.checked);
      }

      syncInputsFromParams('mobile', draftParams);
    });
  });

  root.querySelectorAll('[data-mobile-clear-group]').forEach((clearBtn) => {
    clearBtn.addEventListener('click', () => {
      const param = clearBtn.dataset.mobileClearGroup;
      if (!param) return;
      draftParams.delete(param);
      syncInputsFromParams('mobile', draftParams);
    });
  });

  mobileApplyBtn?.addEventListener('click', () => {
    navigateWithParams(draftParams);
  });

  mobileResetBtn?.addEventListener('click', () => {
    navigateWithParams(new URLSearchParams());
  });

  syncInputsFromParams('desktop', getCurrentParams());

  const initialResults = root.querySelector('#filterableResults');
  if (initialResults) {
    dispatchListingSuccess(window.location.href, initialResults);
  }

  window.addEventListener('popstate', async () => {
    const params = getCurrentParams();
    const next = new URL(window.location.href);
    next.search = params.toString();
    const target = root.querySelector('#filterableResults');
    if (target) {
      loaderEl?.classList.remove('hidden');
      try {
        const response = await zcAdapter.fetch(next.toString());
        if (response.ok) {
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const newResults = doc.querySelector('#filterableResults');
          if (newResults) {
            target.innerHTML = newResults.innerHTML;
            dispatchListingSuccess(next.toString(), target);
          } else {
            dispatchListingError(next.toString(), 'missing-results');
          }
          wireRemoveChips();
        } else {
          dispatchListingError(next.toString(), 'http-' + response.status);
        }
      } catch (err) {
        dispatchListingError(next.toString(), err && err.message ? String(err.message) : 'fetch-failed');
      } finally {
        loaderEl?.classList.add('hidden');
      }
    }
    syncInputsFromParams('desktop', params);
    syncInputsFromParams('mobile', params);
  });
})();
