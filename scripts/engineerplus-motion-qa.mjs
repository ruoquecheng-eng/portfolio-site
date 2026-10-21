import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFile} from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const server = spawn(process.execPath, ['scripts/serve.mjs', '--port', String(port)], {stdio: 'ignore', windowsHide: true});
const base = `http://127.0.0.1:${port}${config.basePath.replace(/\/$/, '')}`;
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({headless: true});
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const locale of ['', 'zh/']) {
      const context = await browser.newContext({reducedMotion});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/${locale}projects/high-speed-rail/demo/#risk`);
      await page.locator('[data-risk-meter]').waitFor({state: 'visible'});
      const checkBar = async (fillSelector, trackSelector, value) => {
        await page.waitForFunction(({fillSelector, value}) => {
          const fill = document.querySelector(fillSelector);
          const matrix = new DOMMatrix(getComputedStyle(fill).transform);
          return Math.abs(matrix.a - value) < 0.001;
        }, {fillSelector, value});
        const state = await page.locator(fillSelector).evaluate(fill => ({
          width: fill.style.width,
          properties: getComputedStyle(fill).transitionProperty,
          origin: getComputedStyle(fill).transformOrigin,
          layout: fill.offsetWidth,
          track: fill.parentElement.clientWidth
        }));
        assert.equal(state.width, '', 'Meter must not write layout width');
        assert.ok(!state.properties.split(',').map(x => x.trim()).includes('width'));
        assert.ok(Math.abs(state.layout - state.track) <= 1, 'Fill keeps full layout width');
        assert.ok(state.origin.startsWith('0px'), 'Meter scales from its left edge');
        if (trackSelector) {
          const [now, min, max] = await page.locator(trackSelector).evaluate(el => ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'].map(key => Number(el.getAttribute(key))));
          assert.ok(Math.abs((now - min) / (max - min) - value) < 0.001, 'ARIA and visual values agree');
        }
      };
      // Rapid input retargets to the last value, without delaying the number.
      await page.locator('[name="guarantee"]').evaluate(input => {
        for (const value of [150, 100, 140, 110, 130]) {
          input.value = value;
          input.dispatchEvent(new Event('input', {bubbles: true}));
        }
      });
      assert.equal(await page.locator('[data-risk-coverage]').textContent(), '100');
      await checkBar('[data-risk-meter]', '.risk-meter', 50 / 90);
      await page.locator('[name="guarantee"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[name="guarantee"]').inputValue(), '131');
      assert.equal(await page.locator('[name="guarantee"]').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');

      await page.goto(`${base}/${locale}projects/high-speed-rail/demo/#impact`);
      await page.locator('[data-map-region="qld"]').focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('[data-map-region="qld"]').getAttribute('aria-pressed'), 'true');
      await page.locator('[data-impact-scenario]').selectOption('lightweight');
      for (const [metric, value] of Object.entries({access: 58, carbon: 65, regional: 63})) {
        await checkBar(`[data-impact-bar="${metric}"]`, null, value / 100);
        assert.equal(await page.locator(`[data-impact-bar-label="${metric}"]`).textContent(), String(value));
      }
      await page.goto(`${base}/${locale}projects/high-speed-rail/demo/#compliance`);
      await page.locator('[name="projectId"]').fill('HSR-QA-001');
      await page.locator('[data-compliance-form] button[type="submit"]').click();
      if (reducedMotion === 'reduce') {
        assert.equal(await page.locator('.progress-track').getAttribute('aria-valuenow'), '100', 'Reduced motion completes immediately');
        await checkBar('[data-compliance-progress]', '.progress-track', 1);
      } else {
        await page.waitForFunction(() => document.querySelector('.progress-track').getAttribute('aria-valuenow') === '25');
        await checkBar('[data-compliance-progress]', '.progress-track', 0.25);
      }
      await page.locator('[data-reset-demo]').click();
      assert.equal(await page.locator('[data-compliance-form] button[type="submit"]').isEnabled(), true, 'Reset restores an interrupted workflow');
      await checkBar('[data-compliance-progress]', '.progress-track', 0);
      await page.waitForTimeout(reducedMotion === 'reduce' ? 100 : 2800);
      assert.equal(await page.locator('.progress-track').getAttribute('aria-valuenow'), '0', 'Canceled timers stay canceled');
      await page.goto(`${base}/${locale}projects/high-speed-rail/demo/#risk`);
      assert.equal(await page.locator('[name="guarantee"]').inputValue(), '120');
      assert.equal(await page.locator('[name="climate"]').inputValue(), '3');
      await checkBar('[data-risk-meter]', '.risk-meter', 40 / 90);
      if (reducedMotion === 'reduce') {
        for (const selector of ['[data-reset-demo]', '[data-risk-meter]']) {
          assert.equal(await page.locator(selector).evaluate(el => el.getAnimations().length), 0, 'Reduced motion has no active transition');
        }
        await page.locator('[data-reset-demo]').focus();
        await page.keyboard.down('Space');
        assert.equal(await page.locator('[data-reset-demo]').evaluate(el => getComputedStyle(el).transform), 'none');
        await page.keyboard.up('Space');
        await page.locator('[data-reset-demo]').evaluate(el => el.blur());
        await page.locator('[data-reset-demo]').hover();
        await page.mouse.down();
        assert.equal(await page.locator('[data-reset-demo]').evaluate(el => getComputedStyle(el).transform), 'none', 'Reduced motion also removes pointer press movement');
        await page.mouse.up();
      }
      await page.goto(`${base}/${locale}projects/high-speed-rail/demo/#capital`);
      const allocation = await page.locator('[data-allocation-bar] span').evaluateAll(spans => spans.map(el => ({width: Number.parseFloat(el.style.width), transition: getComputedStyle(el).transitionProperty})));
      assert.ok(Math.abs(allocation.reduce((sum, segment) => sum + segment.width, 0) - 100) < 0.02);
      assert.ok(allocation.every(segment => !segment.transition.includes('width')), 'Allocation preserves proportional widths without layout transitions');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`EngineerPlus ${locale || 'en/'} ${reducedMotion}: passed`);
    }
  }
} finally {
  await browser?.close();
  server.kill();
}

