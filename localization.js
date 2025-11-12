import { I18n } from 'i18n-js';

/**
 * Main object containing all UI strings for all supported languages.
 * 'en' (English) serves as the base and default language.
 */
export const translations = {
  en: {
    headerTitle: "Tasks",
    headerSubtitle: "{{count}} tasks found",
    loading: "Loading...",
    filterAll: "All",
    filterOpen: "Open",
    filterCompleted: "Completed",
    emptyList: "No tasks found for this filter.",
    textInputPlaceholder: "Add something to do...",
    uncategorized: "Uncategorized",
    deletedCategory: "Deleted Category",
    manageModalTitle: "Settings",
    categoryModalTitle: "Manage Categories",
    manageModalAddNew: "Add New Category",
    manageModalCategoryName: "Category Name",
    manageModalAddButton: "Add",
    manageModalCurrent: "Current Categories",
    manageModalEmpty: "No custom categories yet.",
    changeCategoryModalTitle: "Change Category",
    modalClose: "Close",
    alertErrorTitle: "Error",
    alertCategoryNameEmpty: "Category name cannot be empty.",
    alertDeleteCategoryTitle: "Delete Category",
    alertDeleteCategoryBody: "Are you sure you want to delete this category? Tasks in this category will be marked as 'Uncategorized'.",
    alertCancel: "Cancel",
    alertDelete: "Delete",
    themeTitle: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    languageTitle: "Language",
    languageSystem: "System",
    languageEN: "English",
    languageTR: "Türkçe",
    languageDE: "Deutsch",
    languageFR: "Français",
    languageES: "Español",
    languageIT: "Italiano",
    languagePL: "Polski",
    languageRU: "Русский",
    languagePT: "Português",
    languageAR: "العربية",
    languageEL: "Ελληνικά",
    languageJA: "日本語",
    languageKO: "한국어",
    languageZH: "简体中文",
    languageHI: "हिन्दी",
    languageNL: "Nederlands",
    languageSV: "Svenska",
    languageNO: "Norsk",
    languageDA: "Dansk",
    languageFI: "Suomi",
    languageCS: "Čeština",
  },
  // Turkish
  tr: {
    headerTitle: "Görevler",
    headerSubtitle: "{{count}} adet görev bulundu",
    loading: "Yükleniyor...",
    filterAll: "Tümü",
    filterOpen: "Açık",
    filterCompleted: "Tamamlanan",
    emptyList: "Bu filtreye uygun görev yok.",
    textInputPlaceholder: "Yapılacak bir şey ekle...",
    uncategorized: "Kategorisiz",
    deletedCategory: "Silinmiş Kategori",
    manageModalTitle: "Ayarlar",
    categoryModalTitle: "Kategorileri Yönet",
    manageModalAddNew: "Yeni Kategori Ekle",
    manageModalCategoryName: "Kategori Adı",
    manageModalAddButton: "Ekle",
    manageModalCurrent: "Mevcut Kategoriler",
    manageModalEmpty: "Henüz özel kategori yok.",
    changeCategoryModalTitle: "Kategori Değiştir",
    modalClose: "Kapat",
    alertErrorTitle: "Hata",
    alertCategoryNameEmpty: "Kategori adı boş olamaz.",
    alertDeleteCategoryTitle: "Kategoriyi Sil",
    alertDeleteCategoryBody: "Bu kategoriyi silmek istediğinizden emin misiniz? Bu kategoriye ait görevler 'Kategorisiz' olarak işaretlenecektir.",
    alertCancel: "İptal",
    alertDelete: "Sil",
    themeTitle: "Tema",
    themeLight: "Açık",
    themeDark: "Karanlık",
    themeSystem: "Sistem",
    languageTitle: "Dil",
    languageSystem: "Sistem",
    languageEN: "English",
    languageTR: "Türkçe",
    languageDE: "Deutsch",
    languageFR: "Français",
    languageES: "Español",
    languageIT: "Italiano",
    languagePL: "Polski",
    languageRU: "Русский",
    languagePT: "Português",
    languageAR: "العربية",
    languageEL: "Ελληνικά",
    languageJA: "日本語",
    languageKO: "한국어",
    languageZH: "简体中文",
    languageHI: "हिन्दी",
    languageNL: "Nederlands",
    languageSV: "Svenska",
    languageNO: "Norsk",
    languageDA: "Dansk",
    languageFI: "Suomi",
    languageCS: "Čeština",
  },
  // Other language stubs
  fr: {
    manageModalTitle: "Paramètres",
    categoryModalTitle: "Gérer les catégories",
    // ... (other keys would go here)
  },
  de: {
    manageModalTitle: "Einstellungen",
    categoryModalTitle: "Kategorien verwalten",
    // ... (other keys would go here)
  },
};

// Initialize the i18n-js library with our translations
export const i18n = new I18n(translations);

// Set the initial locale (this will be overridden by settingsContext on app load)
i18n.locale = 'en';

// Enable fallbacks: If a key is missing in the current locale (e.g., 'fr'),
// it will look for it in the 'defaultLocale'.
i18n.enableFallback = true;

// Set the default locale that will be used as a fallback.
i18n.defaultLocale = "en";

/**
 * A convenience wrapper for i18n.t() to make translation calls shorter
 * and more explicit within components.
 * * @param {string} key - The translation key (e.g., "headerTitle")
 * @param {object} [params] - Optional parameters for interpolation (e.g., { count: 5 })
 * @returns {string} The translated string
 */
export const t = (key, params) => i18n.t(key, params);