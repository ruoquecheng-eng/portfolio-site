import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {chromium} from 'playwright';

// Color/opacity feedback remains valid under reduced motion. Reject movement
// using keyframes rather than treating every Web Animation as spatial motion.
async function assertNoMovement(page, message) {
  const moving = await page.evaluate(() => {
    const spatial = /^(transform|translate|rotate|scale|offsetPath|offsetDistance|offsetRotate|width|height|top|right|bottom|left|margin|padding|inset|clipPath)/;
    return document.getAnimations().filter(a => a.playState === 'running').flatMap(a => {
      const frames = a.effect?.getKeyframes() || [];
      const properties = [...new Set(frames.flatMap(Object.keys))].filter(name => spatial.test(name));
      return properties.filter(name => new Set(frames.map(frame => frame[name])).size > 1)
        .map(property => ({target:a.effect.target?.className,property}));
    });
  });
  assert.deepEqual(moving, [], message);
}

async function assertProgressPaused(page, showcase, message) {
  const progress = showcase.locator('[data-probe-progress]');
  await progress.evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.ready)); });
  const before = await progress.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(150);
  assert.equal(await progress.evaluate(el => getComputedStyle(el).transform), before, message);
  assert.equal(await showcase.locator('[data-sequence-play]').getAttribute('aria-pressed'), 'false', message);
}

export async function motionChecks(browser, base, screenshotDir) {
  let checks = 0;
  const errors = [];
  for (const locale of ['', 'zh/']) {
    const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'no-preference'});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/${locale}`);
    assert.ok(await page.locator('.stage-name').isVisible(), 'Home stage shows the name'); checks++;
    await page.waitForFunction(() => Number(document.querySelector('[data-readout="symbols"]')?.textContent.replace(/,/g,'')) > 0);
    assert.match(await page.locator('[data-readout="snr"]').textContent(), /^-?\d+\.\d dB$/, 'Signal readout reports a computed SNR'); checks++;
    assert.equal(await page.locator('.chapter').count(), 4, 'Home presents four project chapters'); checks++;
    await page.locator('.language-switcher a:not([aria-current="page"])').click();
    assert.ok(await page.locator('.stage-name').isVisible(), 'Language switch keeps the stage'); checks++;
    await page.goBack();
    await page.goto(`${base}/${locale}projects/`);
    const categories = page.locator('input[name="project-category"]');
    // Native radio clicks in one browser task exercise cancellation without
    // Playwright's actionability waits accidentally serializing the animations.
    await categories.evaluateAll(inputs => {
      for(const value of ['modeling','all','design','engineering']) inputs.find(input => input.value === value).click();
    });
    await page.waitForTimeout(250);
    assert.equal(new URL(page.url()).searchParams.get('category'), 'engineering');
    assert.equal(await page.locator('[data-project-category]:visible').count(), 2);
    assert.deepEqual(await page.locator('[data-project-category]:visible').evaluateAll(items => items.map(item => item.dataset.projectCategory)), ['engineering','engineering']);
    assert.equal(await page.locator('[data-project-category][hidden]').evaluateAll(items => items.some(item => item.getAnimations().some(a => a.playState === 'running'))), false, 'Hidden filter results retain no animations'); checks++;
    for(const [slug,fragment,section] of [
      ['netsage','page-section-4','app-walkthrough'],
      ['netsage','page-section-11','limitations'],
      ['battery-rul','page-section-2','problem'],
      ['battery-rul','page-section-3','workflow'],
      ['battery-rul','page-section-11','limitations'],
      ['radio-localization','page-section-1','method'],
      ['radio-localization','page-section-2','results']
    ]) {
      await page.goto(`${base}/${locale}projects/${slug}/#${fragment}`);
      assert.equal(await page.locator(`#${fragment}`).evaluate(el=>el.closest('section').id),section,'Previously shared chapter links keep their original destination'); checks++;
      await page.locator('.language-switcher a:not([aria-current="page"])').click();
      assert.equal(new URL(page.url()).hash,`#${fragment}`);
      assert.equal(await page.locator(`#${fragment}`).evaluate(el=>el.closest('section').id),section,'Language switch preserves the original chapter destination'); checks++;
      await page.goBack();
    }
    for (const slug of ['netsage','commlab','radio-localization','battery-rul']) {
      await page.goto(`${base}/${locale}projects/${slug}/`);
      const showcase = page.locator('[data-showcase]').first();
      await showcase.scrollIntoViewIfNeeded();
      const tabs = showcase.getByRole('tab');
      assert.equal(await tabs.count(), 4, `${slug} exposes four selectable steps`);
      await tabs.nth(0).focus();
      await page.keyboard.press('End');
      assert.equal(await tabs.nth(3).getAttribute('aria-selected'), 'true');
      assert.equal(await showcase.getByRole('tabpanel').count(), 1);
      assert.equal(await tabs.nth(3).evaluate(el => el === document.activeElement), true); checks++;
      await assertNoMovement(page, 'Keyboard step selection stays immediate'); checks++;
      await page.keyboard.press('Home');
      await tabs.nth(1).click();
      await tabs.evaluateAll(buttons => {
        for(const index of [3,0,1,3,2]) buttons[index].dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
      });
      assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
      assert.equal(await showcase.getByRole('tabpanel').count(), 1);
      assert.equal(await showcase.locator('[data-panel]:visible').getAttribute('data-panel'), '2'); checks++;
      await page.waitForTimeout(300);
      assert.equal(await showcase.locator('[data-panel]:visible').evaluate(el => getComputedStyle(el).opacity), '1'); checks++;
      if (slug === 'netsage') {
        const play = showcase.locator('[data-sequence-play]');
        assert.equal(await showcase.locator('[data-probe-step]').count(), 4);
        await play.click();
        await page.waitForTimeout(180);
        await play.click();
        assert.equal(await play.getAttribute('aria-pressed'), 'false'); checks++;
        await play.click();
        await page.waitForTimeout(1900);
        assert.equal(await play.getAttribute('aria-pressed'), 'false');
        assert.equal(await showcase.locator('[data-probe-step][data-complete]').count(), 4); checks++;
        await play.click();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        await assertProgressPaused(page, showcase, 'Offscreen playback pauses progress'); checks++;
        await play.scrollIntoViewIfNeeded();
        await play.click();
        await page.waitForTimeout(100);
        // Headless Chromium does not expose native tab occlusion. Keep this
        // explicitly scoped simulation separate from the real viewport test.
        await page.evaluate(() => {
          Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
          document.dispatchEvent(new Event('visibilitychange'));
          delete document.hidden;
        });
        await assertProgressPaused(page, showcase, 'Simulated hidden-document event pauses progress'); checks++;
        await play.click();
        await page.waitForTimeout(100);
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(() => document.querySelector('[data-sequence-play]').hidden);
        assert.equal(await showcase.locator('[data-probe-step][data-complete]').count(), 4);
        await assertNoMovement(page, 'Enabling reduced motion cancels active playback');
        await assertProgressPaused(page, showcase, 'Reduced motion settles active playback'); checks++;
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.waitForFunction(() => !document.querySelector('[data-sequence-play]').hidden);
        assert.equal(await play.getAttribute('aria-pressed'), 'false', 'Preference change never auto-resumes'); checks++;
        await play.click();
        await page.waitForTimeout(100);
        // emulateMedia checks print layout; beforeprint is separately dispatched
        // because Chromium media emulation does not open a native print dialog.
        await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
        await assertProgressPaused(page, showcase, 'Print lifecycle pauses active playback'); checks++;
      }
      await page.emulateMedia({media:'print'});
      assert.equal(await showcase.locator('[data-panel]:visible').count(), 4, 'Print preserves every explanatory step'); checks++;
      assert.equal(await showcase.locator('[data-showcase-controls]:visible,[data-sequence-play]:visible').count(),0,'Print hides interactive controls');
      assert.deepEqual(await showcase.locator('[data-panel]').evaluateAll(panels => panels.map(el => ({transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity}))), Array.from({length:4},()=>({transform:'none',opacity:'1'})), 'All printed panels are settled'); checks++;
      if(await showcase.locator('.method-diagram').count()) {
        const colors=await showcase.locator('.method-node').evaluateAll(nodes=>nodes.map(node=>({background:getComputedStyle(node.querySelector('rect')).fill,text:getComputedStyle(node.querySelector('text')).fill})));
        assert.ok(colors.every(color=>color.background!==color.text),'Printed method labels contrast with their diagram nodes'); checks++;
      }
      await page.emulateMedia({media:'screen'});
      assert.equal(await showcase.locator('[data-panel]:visible').count(), 1);
      if(screenshotDir && locale) {
        await showcase.screenshot({path:path.join(screenshotDir,`motion-${slug}-desktop.png`)});
      }
    }
    await context.close();
    const reduced = await browser.newContext({viewport:{width:360,height:900}, reducedMotion:'reduce',colorScheme:'dark'});
    const reducedPage = await reduced.newPage();
    reducedPage.on('pageerror', error => errors.push(error.message));
    await reducedPage.goto(`${base}/${locale}`);
    assert.equal(await reducedPage.locator('[data-reveal].is-pending').count(), 0, 'Reduced motion keeps all content revealed');
    await assertNoMovement(reducedPage, 'Reduced-motion homepage has no movement'); checks++;
    for(const slug of ['netsage','commlab','radio-localization','battery-rul']) {
      await reducedPage.goto(`${base}/${locale}projects/${slug}/`);
      const showcase = reducedPage.locator('[data-showcase]').first();
      await showcase.scrollIntoViewIfNeeded();
      await showcase.getByRole('tab').nth(3).click();
      assert.equal(await showcase.locator('[data-panel]:visible').getAttribute('data-panel'),'3');
      assert.equal(await reducedPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false);
      await assertNoMovement(reducedPage, 'Reduced motion has no active movement');
      const panel = showcase.locator('[data-panel]:visible');
      assert.equal(await panel.evaluate(el => getComputedStyle(el).transform), 'none', 'Reduced-motion panel is static');
      await reducedPage.waitForTimeout(100);
      assert.equal(await panel.evaluate(el => getComputedStyle(el).transform), 'none', 'Reduced-motion panel remains static'); checks++;
      if(slug==='netsage') {
        assert.equal(await showcase.locator('[data-sequence-play]:visible').count(),0);
        assert.equal(await showcase.locator('[data-probe-step][data-complete]').count(),4); checks++;
      }
      if(screenshotDir && locale) await showcase.screenshot({path:path.join(screenshotDir,`motion-${slug}-mobile-dark.png`)});
    }
    await reduced.close();
    const nojs = await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:900}});
    const staticPage = await nojs.newPage();
    for(const slug of ['netsage','commlab','radio-localization','battery-rul']) {
      await staticPage.goto(`${base}/${locale}projects/${slug}/`);
      assert.equal(await staticPage.locator('[data-panel]:visible').count(),4,'No JS retains all four panels');
      assert.equal(await staticPage.locator('[data-showcase-controls]:visible').count(),0); checks++;
    }
    await nojs.close();
  }
  assert.deepEqual(errors, []);
  console.log(`Motion QA passed: ${checks} state, keyboard, interruption, reduced-motion, print and no-JS checks.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const socket=createServer(); await new Promise(r=>socket.listen(0,'127.0.0.1',r));
  const port=socket.address().port; await new Promise(r=>socket.close(r));
  const server=spawn(process.execPath,['scripts/serve.mjs','--port',String(port)],{cwd:root,stdio:'ignore',windowsHide:true});
  const base=`http://127.0.0.1:${port}/portfolio-site`;
  let browser;
  try {
    for(let i=0;i<100;i++){try{if((await fetch(base+'/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    browser=await chromium.launch({headless:true});
    await motionChecks(browser,base,process.env.QA_SCREENSHOTS);
  } finally { await browser?.close(); server.kill(); }
}
