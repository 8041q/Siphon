import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createInstance } from 'i18next';

import { serviceLabel, stationTypeLabel } from '../src/utils/stationLabels.ts';

const languages = ['en', 'pt', 'es', 'fr', 'de'];
const resources = Object.fromEntries(await Promise.all(languages.map(async (language) => [
  language,
  { translation: JSON.parse(await readFile(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8')) },
])));

// Complete set of service descriptions and station types in the PT registry data.
const services = [
  ['WC', 'Toilets'],
  ['WC para deficientes', 'Accessible toilets'],
  ['WC com fraldário', 'Baby changing facilities'],
  ['Cafetaria', 'Café'],
  ['Restaurante', 'Restaurant'],
  ['Loja de Conveniência', 'Convenience store'],
  ['Multibanco', 'ATM'],
  ['Calibragem de pneus', 'Tyre inflation'],
  ['Lavagem', 'Car wash'],
  ['Assistência auto', 'Vehicle assistance'],
  ['Descanso de pesados', 'Truck rest area'],
  ['Venda de gás doméstico em garrafas', 'Bottled gas'],
  ['Venda de carburante de qualidade superior', 'Premium fuel'],
  ['Venda de gasóleo agrícola', 'Agricultural diesel'],
  ['Venda de gasóleo para aquecimento', 'Heating oil'],
  ['AUTOvoucher', 'AUTOvoucher'],
  ['Via verde', 'Via Verde'],
];
const stationTypes = [
  ['Outro', 'Other'],
  ['Auto-estrada', 'Motorway'],
  ['Área comercial (Hipermercados)', 'Commercial area (hypermarkets)'],
];

test('every registry service and station type has its own translation in every supported language', async () => {
  const i18n = createInstance();
  await i18n.init({ resources, lng: 'en', fallbackLng: false });

  for (const language of languages) {
    await i18n.changeLanguage(language);
    for (const [label, entries] of [[serviceLabel, services], [stationTypeLabel, stationTypes]]) {
      const translatedKeys = new Set();
      for (const [source, english] of entries) {
        const translate = (key, options) => {
          const value = i18n.getResource(language, 'translation', key);
          assert.equal(typeof value, 'string', `${language}: missing ${key} for ${source}`);
          assert.ok(value.trim(), `${language}: empty ${key}`);
          translatedKeys.add(key);
          return i18n.t(key, options);
        };
        const result = label(source, translate);
        if (language === 'en') assert.equal(result, english);
      }
      assert.equal(translatedKeys.size, entries.length);
    }
  }
});

test('labels follow the current language when it changes', async () => {
  const i18n = createInstance();
  await i18n.init({ resources, lng: 'en', fallbackLng: false });
  const expected = {
    en: ['ATM', 'Accessible toilets', 'Motorway'],
    pt: ['Multibanco', 'WC acessível', 'Autoestrada'],
    es: ['Cajero automático', 'Aseos accesibles', 'Autopista'],
    fr: ['Distributeur de billets', 'Toilettes accessibles', 'Autoroute'],
    de: ['Geldautomat', 'Barrierefreie Toiletten', 'Autobahn'],
  };
  for (const language of languages) {
    await i18n.changeLanguage(language);
    assert.deepEqual([
      serviceLabel('Multibanco', i18n.t),
      serviceLabel('WC para deficientes', i18n.t),
      stationTypeLabel('Auto-estrada', i18n.t),
    ], expected[language]);
  }
});

test('registry formatting variations still translate and unknown values remain readable', async () => {
  const i18n = createInstance();
  await i18n.init({ resources, lng: 'en', fallbackLng: false });
  assert.equal(serviceLabel('  LOJA  DE CONVENIENCIA  ', i18n.t), 'Convenience store');
  assert.equal(serviceLabel('WC com fralda\u0301rio', i18n.t), 'Baby changing facilities');
  assert.equal(stationTypeLabel('  area comercial (HIPERMERCADOS) ', i18n.t), 'Commercial area (hypermarkets)');
  for (const label of [serviceLabel, stationTypeLabel]) {
    for (const value of ['New registry value', 'constructor', 'toString', '', '  Unknown  ']) {
      assert.equal(label(value, i18n.t), value);
    }
  }
});
