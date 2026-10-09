/* Pure rules and scheduling, shared by the app and Node tests. */
(function (root) {
  'use strict';
  const MODES = ['fat_single', 'fat_master', 'sep_double'];
  function normalize(token) { return ['B', 'DB'].includes(token) ? 'BULL' : token; }
  function validToken(token, mode) {
    return typeof token === 'string' && (/^[SDT]([1-9]|1[0-9]|20)$/.test(token) || token === 'BULL' || token === 'MISS' || (token === 'SB' && mode === 'sep_double'));
  }
  function value(token) {
    if (token === 'BULL') return 50;
    if (token === 'SB') return 25;
    if (token === 'MISS') return 0;
    return Number(token.slice(1)) * ({ S: 1, D: 2, T: 3 }[token[0]] || 0);
  }
  function finish(token, mode) {
    if (!validToken(token, mode) || token === 'MISS') return false;
    if (mode === 'fat_single') return true;
    if (mode === 'fat_master') return /^[DT]/.test(token) || token === 'BULL';
    return token.startsWith('D') || token === 'BULL';
  }
  function outcome(score, route, mode) {
    let remaining = score;
    for (let i = 0; i < route.length; i++) {
      const token = route[i];
      if (!validToken(token, mode)) return { done: true, correct: false, remaining, reason: 'invalid' };
      remaining -= value(token);
      if (remaining < 0 || (remaining === 1 && mode !== 'fat_single')) return { done: true, correct: false, remaining, reason: 'bust' };
      if (remaining === 0) return { done: true, correct: finish(token, mode) && i === route.length - 1, remaining, reason: finish(token, mode) ? 'finish' : 'finish-rule' };
    }
    return { done: route.length >= 3, correct: false, remaining, reason: route.length >= 3 ? 'unfinished' : 'pending' };
  }
  function validRoute(score, route, mode) {
    return Number.isInteger(score) && score >= 1 && score <= 180 && MODES.includes(mode) && Array.isArray(route) && route.length > 0 && route.length <= 3 && outcome(score, route, mode).correct;
  }
  const routeCache = new Map();
  function generatedRoute(score, mode, maxDarts = 3) {
    if(!Number.isInteger(score) || score < 1 || score > 180 || !MODES.includes(mode) || ![1,2,3].includes(maxDarts)) return null;
    const key = `${mode}:${score}:${maxDarts}`;
    if (routeCache.has(key)) return routeCache.get(key);
    const tokens = [];
    for (const prefix of ['T', 'S', 'D']) for (let n = 20; n >= 1; n--) tokens.push(prefix + n);
    tokens.push('BULL'); if (mode === 'sep_double') tokens.push('SB');
    const ends = tokens.filter(t => finish(t, mode));
    let found = null;
    // Prefer fewer darts. Generated routes are legal examples, not coaching recommendations.
    for (const last of ends) if (validRoute(score, [last], mode)) { found = [last]; break; }
    if (!found && maxDarts >= 2) for (const first of tokens) {
      for (const last of ends) if (validRoute(score, [first, last], mode)) { found = [first, last]; break; }
      if (found) break;
    }
    if (!found && maxDarts >= 3) for (const first of tokens) {
      for (const second of tokens) {
        const last = ends.find(t => value(t) === score - value(first) - value(second));
        if (last && validRoute(score, [first, second, last], mode)) { found = [first, second, last]; break; }
      }
      if (found) break;
    }
    routeCache.set(key, found); return found;
  }
  function missPlans(score, route, mode) {
    if (!route?.length) return [];
    const target = route[0];
    const ring = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
    const actual = ['MISS'];
    if (/^[SDT]/.test(target)) {
      const n = Number(target.slice(1));
      if (target[0] !== 'S') actual.push('S'+n);
      const index = ring.indexOf(n);
      actual.push('S'+ring[(index+19)%20], 'S'+ring[(index+1)%20]);
    } else if (target === 'BULL' && mode === 'sep_double') actual.push('SB');
    return actual.map(token => {
      const result = outcome(score, [token], mode);
      const route = result.done ? null : generatedRoute(result.remaining, mode, 2);
      const nextTurn = !result.done && !route ? generatedRoute(result.remaining, mode) : null;
      return { target, actual: token, ...result, route, nextTurn };
    });
  }
  function candidates(min, max, mode) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 2 || max > 180 || min > max || !MODES.includes(mode)) return [];
    return Array.from({ length: max - min + 1 }, (_, i) => min + i).filter(s => generatedRoute(s, mode));
  }
  function nextSequential(scores, previous) {
    return scores.find(score=>previous === null || score>previous) ?? scores[0] ?? null;
  }
  function select(scores, stats, prioritize, previous, random = Math.random) {
    if (!scores.length) return null;
    const pool = scores.length > 1 ? scores.filter(s => s !== previous) : scores;
    const weak = pool.filter(s => stats[s]?.review);
    const choices = prioritize && weak.length && random() < 0.7 ? weak : pool;
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  }
  const api = { MODES, normalize, validToken, value, finish, outcome, validRoute, generatedRoute, missPlans, candidates, nextSequential, select };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PracticeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
