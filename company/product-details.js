(() => {
  const recipes = {
    'Filtre Kahve': { ingredients: 'Filtre kahve, su.', allergens: 'Reçetede süt kullanılmaz. Ortak ekipman ve servis koşullarını personele sorunuz.' },
    'Latte': { milk: true, espresso: true, syrup: true, temperature: true, ingredients: 'Espresso, süt.', allergens: 'Süt.' },
    'Americano': { espresso: true, temperature: true, ingredients: 'Espresso, su.', allergens: 'Ortak ekipman ve servis koşullarını personele sorunuz.' },
    'Mocha': { milk: true, espresso: true, syrup: true, temperature: true, ingredients: 'Espresso, süt, çikolata sosu.', allergens: 'Süt; çikolata sosuna göre soya içerebilir.' },
    'Iced Mocha': { milk: true, espresso: true, syrup: true, ingredients: 'Espresso, süt, çikolata sosu, buz.', allergens: 'Süt; çikolata sosuna göre soya içerebilir.' },
    'Cold Brew': { ingredients: 'Soğuk demlenmiş kahve, su, buz.', allergens: 'Ortak ekipman ve servis koşullarını personele sorunuz.' },
    'Iced Latte': { milk: true, espresso: true, syrup: true, ingredients: 'Espresso, süt, buz.', allergens: 'Süt.' },
    'Berry Refresha': { ingredients: 'Örnek orman meyvesi karışımı, su, buz.', allergens: 'Meyve karışımının gerçek içeriğini ve alerjenlerini personele sorunuz.' },
    'Matcha Latte': { milk: true, syrup: true, temperature: true, ingredients: 'Matcha yeşil çay tozu, süt, su.', allergens: 'Süt.' },
    'Demleme Çay': { ingredients: 'Siyah çay, su.', allergens: 'Ortak ekipman ve servis koşullarını personele sorunuz.' },
    'Çikolatalı Pasta': { portion: '1 dilim', ingredients: 'Örnek reçete: un, şeker, yumurta, süt, kakao, çikolata.', allergens: 'Gluten (buğday), yumurta, süt; çikolataya göre soya içerebilir.' },
    'Cheesecake': { portion: '1 dilim', ingredients: 'Örnek reçete: krem peynir, bisküvi, tereyağı, yumurta, şeker, meyve sosu.', allergens: 'Süt, gluten (buğday), yumurta.' },
    'Izgara Sandviç': { portion: '1 adet', ingredients: 'Örnek reçete: ekmek, peynir, yeşillik.', allergens: 'Gluten (buğday), süt; kullanılan ekmeğe göre susam içerebilir.' },
    'Tereyağlı Kruvasan': { portion: '1 adet', ingredients: 'Örnek reçete: un, tereyağı, süt, yumurta, maya.', allergens: 'Gluten (buğday), süt, yumurta.' }
  };
  const money = value => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
  const dialog = document.createElement('dialog');
  dialog.className = 'product-dialog';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  dialog.innerHTML = `
    <div class="sheet-header">
      <span class="sheet-handle" aria-hidden="true"></span>
      <button class="detail-close" type="button" aria-label="Ürün detayını kapat">×</button>
    </div>
    <div class="detail-scroll">
      <img class="detail-photo" alt="">
      <div class="detail-content">
        <p class="detail-category"></p>
        <h2 id="detail-title" tabindex="-1"></h2>
        <p class="detail-description"></p>
        <form class="detail-options" aria-label="Ürün seçenekleri"></form>
        <section class="detail-ingredients" aria-label="İçerik bilgileri">
          <h3>İçindekiler · örnek reçete</h3><p class="ingredients-text"></p>
          <h3>Alerjen bilgisi · örnek reçete</h3><p class="allergens-text"></p>
          <p class="demo-info">Bu bilgiler demo içindir. Gerçek içerik, alerjenler ve çapraz temas bilgisi için sipariş öncesi personele danışınız. Süt tercihi diğer alerjenleri ortadan kaldırmaz.</p>
        </section>
      </div>
    </div>
        <div class="detail-footer">
          <div class="detail-total"><span>Seçiminin fiyatı</span><output class="detail-price" aria-live="polite"></output></div>
          <p class="detail-summary"></p>
          <button class="detail-save" type="button">Seçimi kaydet</button>
          <p class="detail-demo">Demo seçimidir; sipariş veya ödeme oluşturmaz. Fiyatlar örnektir.</p>
        </div>`;
  document.body.append(dialog);
  const find = selector => dialog.querySelector(selector);
  const form = find('form');
  let product;
  let returnFocus;
  let closing = false;
  let dragStart = null;
  let dragOffset = 0;

  async function closeSheet() {
    if (closing || !dialog.open) return;
    closing = true;
    let animation;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation = dialog.animate([
        { transform: `translateY(${dragOffset}px)` },
        { transform: 'translateY(100%)' }
      ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
      try { await animation.finished; } catch { /* Closing can interrupt the animation. */ }
    }
    dialog.close();
    animation?.cancel();
    closing = false;
  }

  function radioGroup(title, name, options) {
    return `<fieldset><legend>${title}</legend><div class="choice-group">${options.map((option, i) => `<label class="detail-choice"><input type="radio" name="${name}" value="${i}" data-price="${option.price || 0}" data-label="${option.label}" ${i === 0 ? 'checked' : ''}><span class="choice-label">${option.label}${option.note ? `<small>${option.note}</small>` : ''}</span></label>`).join('')}</div></fieldset>`;
  }

  function update() {
    const selected = [...form.querySelectorAll('input:checked, option:checked')];
    const total = product.base + selected.reduce((sum, item) => sum + Number(item.dataset.price || 0), 0);
    find('.detail-price').value = money(total);
    find('.detail-summary').textContent = selected.length ? selected.map(item => item.dataset.label).join(' · ') : product.recipe.portion;
  }

  function open(card, trigger) {
    if (dialog.open || closing) return;
    const name = card.querySelector('h2').textContent;
    product = { name, base: Number(card.querySelector('.price').textContent.replace(/[^\d]/g, '')), recipe: recipes[name] };
    const recipe = product.recipe;
    returnFocus = trigger;
    const photo = card.querySelector('img');
    find('.detail-photo').src = photo.src;
    find('.detail-photo').alt = photo.alt;
    find('#detail-title').textContent = name;
    find('.detail-category').textContent = card.querySelector('.type').textContent;
    find('.detail-description').textContent = card.querySelector('.info p').textContent;
    find('.ingredients-text').textContent = recipe.ingredients;
    find('.allergens-text').textContent = recipe.allergens;
    let options = '';
    if (!recipe.portion) {
      const cold = card.dataset.category === 'soguk';
      options += radioGroup('Servis', 'temperature', recipe.temperature ? [{label:'Sıcak'}, {label:'Soğuk'}] : [{label:cold ? 'Soğuk' : 'Sıcak'}]);
      options += radioGroup('Boy', 'size', [
        {label:'Küçük',note:`250 ml · ${money(product.base)}`},
        {label:'Orta',note:`350 ml · ${money(product.base + 20)}`,price:20},
        {label:'Büyük',note:`450 ml · ${money(product.base + 35)}`,price:35}
      ]);
      if (recipe.milk) options += radioGroup('Süt tercihi', 'milk', [
        {label:'Standart süt'}, {label:'Laktozsuz süt',note:'+₺15',price:15},
        {label:'Yulaf içeceği',note:'+₺25',price:25}, {label:'Badem içeceği',note:'+₺25',price:25}
      ]);
      if (recipe.espresso) options += radioGroup('Ekstra espresso', 'shot', [{label:'Ekstra yok'},{label:'+1 shot',note:'+₺25',price:25},{label:'+2 shot',note:'+₺50',price:50}]);
      if (recipe.syrup) options += `<fieldset><legend><label for="detail-syrup">Şurup</label></legend><select id="detail-syrup" name="syrup"><option value="none" data-label="Şurup yok" data-price="0">Şurup yok</option><option value="vanilla" data-label="Vanilya şurubu" data-price="20">Vanilya · +₺20</option><option value="caramel" data-label="Karamel şurubu" data-price="20">Karamel · +₺20</option></select></fieldset>`;
    }
    form.innerHTML = options;
    form.hidden = Boolean(recipe.portion);
    update();
    document.body.classList.add('details-open');
    dialog.showModal();
    find('#detail-title').focus({preventScroll:true});
    find('.detail-scroll').scrollTop = 0;
  }

  form.addEventListener('change', update);
  form.addEventListener('submit', event => event.preventDefault());
  find('.detail-close').addEventListener('click', closeSheet);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeSheet();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('details-open');
    dialog.style.transform = '';
    dragStart = null;
    dragOffset = 0;
    returnFocus?.focus({preventScroll:true});
  });
  find('.detail-save').addEventListener('click', async () => {
    const message = `${product.name} · ${find('.detail-price').value} · demo seçimi kaydedildi`;
    await closeSheet();
    notify(message);
  });
  const handle = find('.sheet-header');
  handle.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button !== 0 || closing) return;
    dragStart = event.clientY;
    dragOffset = 0;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (dragStart === null || closing) return;
    dragOffset = Math.max(0, event.clientY - dragStart);
    dialog.style.transform = `translateY(${dragOffset}px)`;
  });
  function endDrag(event) {
    if (dragStart === null) return;
    dragStart = null;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (event.type !== 'pointercancel' && dragOffset > 90) closeSheet();
    else { dialog.style.transform = ''; dragOffset = 0; }
  }
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  document.querySelectorAll('.product').forEach(card => {
    const heading = card.querySelector('h2');
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'product-title';
    title.textContent = heading.textContent;
    title.setAttribute('aria-haspopup','dialog');
    heading.replaceChildren(title);
    const add = card.querySelector('.add');
    add.setAttribute('aria-label', `${title.textContent} seçeneklerini aç`);
    add.setAttribute('aria-haspopup','dialog');
    card.addEventListener('click', event => open(card, event.target.closest('button') || title));
  });
})();
