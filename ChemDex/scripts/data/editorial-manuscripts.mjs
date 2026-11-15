// Single registry consumed by both the library builder and manuscript checks.
// Entries are authored articles; this registry does not generate title variants.
import {editorialArticles} from './editorial-articles.mjs';
import {editorialBiographies} from './editorial-biographies.mjs';
import {editorialApplications} from './editorial-applications.mjs';
import {editorialBiographiesWave2} from './editorial-biographies-wave2.mjs';
import {editorialConceptsWave2} from './editorial-concepts-wave2.mjs';
import {editorialElementsWave2} from './editorial-elements-wave2.mjs';

export const editorialManuscripts = [
  ...editorialArticles,
  ...editorialBiographies,
  ...editorialApplications,
  ...editorialBiographiesWave2,
  ...editorialConceptsWave2,
  ...editorialElementsWave2,
];
