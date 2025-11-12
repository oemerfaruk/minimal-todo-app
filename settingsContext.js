import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { i18n, translations } from './localization';

// Uygulamanın kullanacağı statik renk paletleri.
const lightColors = {
  isDark: false,
  background: '#f7f8fa',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#888888',
  input: '#f0f0f0',
  borderColor: '#eeeeee',
  primary: '#000000',
  shadow: '#000000',
  modalBackdrop: 'rgba(0, 0, 0, 0.4)',
};

const darkColors = {
  isDark: true,
  background: '#1a1a1a',
  card: '#2c2c2c',
  text: '#f5f5f5',
  textSecondary: '#999999',
  input: '#3b3b3b',
  borderColor: '#444444',
  primary: '#ffffff',
  shadow: '#000000',
  modalBackdrop: 'rgba(0, 0, 0, 0.6)',
};

// Ayarları AsyncStorage'a kaydetmek için kullanılacak anahtarlar.
const THEME_KEY = '@MyApp:theme';
const LANGUAGE_KEY = '@MyApp:language';

// Ayarları (tema, dil) tutacak ana Context.
const SettingsContext = createContext(null);

/**
 * i18n kütüphanesine seçilen dili (veya sistem dilini) uygulayan yardımcı fonksiyon.
 * @param {string} languagePreference - 'system', 'en', 'tr', vb.
 * @returns {string} Gerçekte ayarlanan dil kodu (örn: 'en', 'tr')
 */
const setLocale = (languagePreference) => {
  // Cihazın dilini güvenli bir şekilde al
  const systemLocale = Localization.getLocales()[0]?.languageCode || 'en';
  
  let newLocale = 'en'; // Varsayılan dil

  if (languagePreference === 'system') {
    newLocale = systemLocale;
  } else {
    newLocale = languagePreference;
  }

  // Eğer bizim çeviri (translations) dosyamızda bu dil yoksa, 'en' (İngilizce) kullan.
  if (!translations.hasOwnProperty(newLocale)) {
    newLocale = 'en';
  }

  i18n.locale = newLocale;
  return newLocale; // Gerçekte hangi dilin ayarlandığını döndür
};

/**
 * Context verilerini sağlayan ana bileşen.
 * Bu bileşen, uygulamanın tamamını (genellikle App.js içinde) sarmalıdır.
 */
export const SettingsProvider = ({ children }) => {
  // Cihazın mevcut temasını ('light' veya 'dark') alır.
  const systemTheme = useColorScheme(); 
  
  // State Tanımları
  // Kullanıcının kaydettiği tema tercihi ('system', 'light', 'dark')
  const [themePreference, setThemePreference] = useState('system'); 
  // Kullanıcının kaydettiği dil tercihi ('system', 'en', 'tr', vb.)
  const [language, setLanguage] = useState('system'); 

  // --- Efektler ---

  // 1. İlk Yükleme Efekti:
  // Uygulama açılır açılmaz, AsyncStorage'tan kayıtlı ayarları yükler.
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Kayıtlı temayı yükle
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (storedTheme) {
          setThemePreference(storedTheme);
        }
        
        // Kayıtlı dili yükle (yoksa 'system' varsay)
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        const initialLanguage = storedLanguage || 'system';
        setLanguage(initialLanguage);
        
        // Uygulama açılır açılmaz dili doğru ayarlamak için
        // i18n'i yüklenen 'initialLanguage' ile güncelle.
        setLocale(initialLanguage);

      } catch (e) {
        console.error("Kaydedilmiş ayarlar yüklenemedi", e);
      }
    };

    loadSettings();
  }, []); // [] = Sadece bir kez (component mount) çalışır.

  // 2. Tema Değişikliği Efekti:
  // 'themePreference' state'i her değiştiğinde, yeni değeri AsyncStorage'a kaydeder.
  useEffect(() => {
    AsyncStorage.setItem(THEME_KEY, themePreference);
  }, [themePreference]);

  // 3. Dil Değişikliği Efekti:
  // 'language' state'i her değiştiğinde, değeri diske kaydeder VE
  // i18n kütüphanesini anında günceller.
  useEffect(() => {
    AsyncStorage.setItem(LANGUAGE_KEY, language);
    setLocale(language);
  }, [language]);

  // --- Değer Hesaplamaları ---

  // Performans için: 'systemTheme' veya 'themePreference' değişmediği sürece
  // 'colors' nesnesini yeniden hesaplama.
  // Kullanılacak son renk paletini belirler.
  const colors = useMemo(() => {
    // Eğer tercih 'system' ise, cihazın kendi temasına (systemTheme) uy
    if (themePreference === 'system') {
      return systemTheme === 'dark' ? darkColors : lightColors;
    }
    // Eğer tercih 'system' değilse, doğrudan tercihe (light/dark) uy
    return themePreference === 'dark' ? darkColors : lightColors;
  }, [systemTheme, themePreference]);

  // Context'in alt bileşenlere sağlayacağı değerler.
  const value = {
    colors, // Hesaplanan (dinamik) renk paleti
    themePreference, // 'system', 'light', 'dark'
    setThemePreference, // (theme) => {} fonksiyonu
    language, // 'system', 'en', 'tr'
    setLanguage, // (lang) => {} fonksiyonu
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Context'e kolayca erişmek için kullanılacak custom hook.
 * Bileşenlerin `useContext(SettingsContext)` yazması yerine `useSettings()`
 * yazmasını sağlar.
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    // Bu hata, <SettingsProvider> sarmalayıcısı dışında
    // 'useSettings()' kullanıldığında tetiklenir.
    throw new Error('useSettings, SettingsProvider içinde kullanılmalıdır');
  }
  return context;
};