import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView, // Klavye için
  Platform,
  Keyboard,
  StatusBar,
  ScrollView,
  Modal, 
  Alert, 
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { t } from './localization'; // Çeviri fonksiyonu
import { SettingsProvider, useSettings } from './settingsContext'; // Tema ve Dil context'i

// Depolama (AsyncStorage) için kullanılacak anahtarlar.
// Versiyonu (v4) değiştirmek, kullanıcının eski verilerini sıfırlar.
const TODO_STORAGE_KEY = '@my_todos_v4';
const CATEGORY_STORAGE_KEY = '@my_categories_v4';

// Yeni kategori eklerken kullanılacak varsayılan renk paleti
const COLOR_PALETTE = [
  '#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6',
  '#e67e22', '#1abc9c', '#34495e', '#bdc3c7',
];

// Kategori ID'si olmayan (null) veya kategorisi silinmiş görevler için
// kullanılacak varsayılan obje.
const UNCATEGORIZED = { id: null, color: '#bdc3c7' };


// -----------------------------------------------------------------
// AppWrapper
// -----------------------------------------------------------------

// Ayarlar Context'ini (Tema, Dil) tüm uygulamaya sağlar.
export default function AppWrapper() {
  return (
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
}

// -----------------------------------------------------------------
// Ana Uygulama Bileşeni
// -----------------------------------------------------------------
function App() {
  // Global context'ten ayarları (renkler, tema, dil) al
  const { 
    colors, 
    themePreference, 
    setThemePreference,
    language, 
    setLanguage 
  } = useSettings();

  // --- State (Durum) Tanımları ---
  const [ready, setReady] = useState(false); // Verilerin yüklenip yüklenmediğini tutar
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all'); // Aktif filtre (all, completed, category_1...)
  const [text, setText] = useState(''); // Yeni görev input'u
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState(null); // Görev eklerken seçilen kategori
  
  // Modal görünürlük durumları
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false); 
  const [isChangeCategoryModalVisible, setIsChangeCategoryModalVisible] = useState(false);

  // Kategori Ekleme/Yönetme state'leri
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_PALETTE[0]);

  // Kategori Değiştirme state'leri
  const [selectedTodoId, setSelectedTodoId] = useState(null); // Kategorisi değiştirilecek görevin ID'si
  
  // Ayarlar -> Dil state'i
  const [showLanguageList, setShowLanguageList] = useState(false);

  
  // Dil listesi, 'language' (ve dolayısıyla 't' fonksiyonu) değiştiğinde
  // çevirilerin (örn: "Sistem") güncellenmesi için useMemo kullanır.
  const SUPPORTED_LANGUAGES = useMemo(() => [
    { code: 'system', name: t('languageSystem') },
    { code: 'en', name: t('languageEN') }, { code: 'tr', name: 'Türkçe' }, // 'tr' için her zaman "Türkçe" göster
    // ... diğer diller ...
    { code: 'cs', name: t('languageCS') },
  ], [language]); 

  // O an seçili dilin koduna (örn: 'tr') karşılık gelen adı (örn: 'Türkçe') bulur.
  const currentLanguageName = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || '...';
  }, [language, SUPPORTED_LANGUAGES]);


  // 1. Veri Yükleme
  // Bileşen ilk yüklendiğinde (componentDidMount) verileri yükle.
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    await loadCategories(); // Önce kategoriler
    await loadTodos();      // Sonra görevler
    setReady(true);         // Yükleme tamamlandı
  }

  // Kategorileri diskten (AsyncStorage) yükler.
  // Bulamazsa, varsayılan 'Genel' kategorisini oluşturur.
  const loadCategories = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(CATEGORY_STORAGE_KEY);
      if (jsonValue !== null) {
        setCategories(JSON.parse(jsonValue));
      } else {
        // İlk çalıştırma: Varsayılan kategoriyi ayarla
        const initialCategories = [{ id: '1', name: 'Genel', color: '#bdc3c7' }];
        setCategories(initialCategories);
      }
    } catch (e) { console.log('Kategori yükleme hatası:', e); }
  };

  // Görevleri diskten (AsyncStorage) yükler.
  const loadTodos = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(TODO_STORAGE_KEY);
      if (jsonValue !== null) {
        setTodos(JSON.parse(jsonValue));
      }
    } catch (e) { console.log('Todo yükleme hatası:', e); }
  };

  // 2. Veri Kaydetme
  // [todos] state'i her değiştiğinde ve uygulama hazır (ready) olduğunda diske kaydet.
  useEffect(() => {
    if (ready) saveTodos(todos);
  }, [todos, ready]);

  // [categories] state'i her değiştiğinde ve uygulama hazır (ready) olduğunda diske kaydet.
  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);

  const saveTodos = async (currentTodos) => {
    try {
      const jsonValue = JSON.stringify(currentTodos);
      await AsyncStorage.setItem(TODO_STORAGE_KEY, jsonValue);
    } catch (e) { console.log('Todo kaydetme hatası:', e); }
  };

  const saveCategories = async (currentCategories) => {
    try {
      const jsonValue = JSON.stringify(currentCategories);
      await AsyncStorage.setItem(CATEGORY_STORAGE_KEY, jsonValue);
    } catch (e) { console.log('Kategori kaydetme hatası:', e); }
  };

  // 3. Yardımcı Fonksiyon: Kategori Bilgisi Getir
  
  // Bir ID'ye göre tam kategori nesnesini bulan yardımcı fonksiyon.
  // Kategorisiz veya silinmiş durumları da ele alır.
  // Performans için useCallback ile sarmalandı.
  const getCategory = useCallback((id) => {
      if (id === null || id === undefined) {
        // Kategorisiz
        return { ...UNCATEGORIZED, name: t('uncategorized') };
      }
      const found = categories.find(c => c.id === id);
      if (found) return found;
      // Kategori silinmiş ama görev kalmışsa
      return { id: id, name: t('deletedCategory'), color: '#7f8c8d' };
    }, [categories, language]); // language bağımlılığı 't' fonksiyonunun çevirileri için gerekli.

  // 4. Memoized (Performans) Hesaplamaları
  
  // Performans: 'todos' veya 'categories' her değiştiğinde
  // tüm filtre sekmelerindeki (Genel, Tamamlanan, Kategoriler...)
  // görev sayılarını tek seferde hesaplar.
  const filterCounts = useMemo(() => {
    const counts = { all: todos.length, completed: 0, incomplete: 0, category_null: 0 };
    // Başlangıçta tüm kategori sayaçlarını sıfırla
    categories.forEach(c => { counts['category_'
 + c.id] = 0; });
    
    // Tüm görevleri tek tek dolaş
    for (const todo of todos) {
      if (todo.completed) counts.completed++;
      else counts.incomplete++;
      
      const categoryKey = 'category_' + (todo.category || 'null');
      if (counts[categoryKey] !== undefined) counts[categoryKey]++;
    }
    return counts;
  }, [todos, categories]);

  // Performans: Aktif filtreye ('filter') veya ana listeye ('todos')
  // göre gösterilecek görev listesini hesaplar.
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'all': return todos;
      case 'completed': return todos.filter(t => t.completed);
      case 'incomplete': return todos.filter(t => !t.completed);
      case 'category_null': return todos.filter(t => t.category === null);
      default:
        // 'category_...' formatındaki özel filtreler
        if (filter.startsWith('category_')) {
          const categoryId = filter.split('_')[1];
          return todos.filter(t => t.category === categoryId);
        }
        return todos;
    }
  }, [todos, filter]);

  // 5. Todo Fonksiyonları
  
  // Yeni bir görev oluştur ve listeye (state'e) ekle.
  const addTodo = () => {
    if (!text.trim()) return; // Boş görev eklemeyi engelle
    const newTodo = {
      id: Date.now().toString(),
      title: text.trim(),
      completed: false,
      category: selectedCategoryToAdd, // Input alanından seçili kategori
    };
    setTodos([newTodo, ...todos]); // Yeni görevi listenin başına ekle
    setText('');
    setSelectedCategoryToAdd(null); // Kategori seçimini sıfırla
    Keyboard.dismiss();
  };
  
  // Görevi sil
  const deleteTodo = (id) => { setTodos(todos.filter((item) => item.id !== id)); };

  // Görevin tamamlanma durumunu değiştir
  const toggleTodo = (id) => {
    setTodos(
      todos.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // 6. Kategori Yönetim Fonksiyonları
  
  // Kategori yönetim modalında yeni kategori ekler
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert(t('alertErrorTitle'), t('alertCategoryNameEmpty'));
      return;
    }
    const newCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      color: newCategoryColor,
    };
    setCategories([...categories, newCategory]);
    // Input'ları sıfırla
    setNewCategoryName('');
    setNewCategoryColor(COLOR_PALETTE[0]);
  };
  
  // Kategori yönetim modalında kategori siler
  // Silmeden önce onay ister.
  // Silinen kategorideki görevleri "kategorisiz" (null) olarak günceller.
  const handleDeleteCategory = (idToDelete) => {
    Alert.alert(
      t('alertDeleteCategoryTitle'),
      t('alertDeleteCategoryBody'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'), style: 'destructive',
          onPress: () => {
            // Kategoriyi listeden çıkar
            setCategories(categories.filter(c => c.id !== idToDelete));
            // Görevlerdeki bu kategori ID'lerini 'null' yap
            setTodos(todos.map(t => 
              t.category === idToDelete ? { ...t, category: null } : t
            ));
          },
        },
      ]
    );
  };

  // 7. Kategori Değiştirme Fonksiyonları (Göreve Uzun Basma)
  
  // Bir görevin kategorisini değiştirmek için modalı açar
  const openChangeCategoryModal = (id) => {
    setSelectedTodoId(id); // Hangi görevin değiştirileceğini state'e kaydet
    setIsChangeCategoryModalVisible(true);
  };

  // Kategori değiştirme modalını kapatır ve seçimi sıfırlar
  const closeChangeCategoryModal = () => {
    setIsChangeCategoryModalVisible(false);
    setSelectedTodoId(null);
  };

  // Görevin kategorisini günceller ve modalı kapatır
  const handleChangeTodoCategory = (newCategoryId) => {
    setTodos(todos.map(todo => 
      todo.id === selectedTodoId ? { ...todo, category: newCategoryId } : todo
    ));
    closeChangeCategoryModal();
  };

  // Dinamik (Temaya duyarlı) stil sayfası
  const styles = createStyles(colors);

  // 8. Render Fonksiyonları
  
  // FlatList'teki her bir görev satırını render eder.
  const renderItem = ({ item }) => {
    const itemCategory = getCategory(item.category);
    return (
      <View style={[
        styles.itemContainer,
        // Kategori rengine göre sol kenarlık
        { borderLeftColor: itemCategory.color, borderLeftWidth: 5 } 
      ]}>
        
        {/* Görev Metni ve Tamamlama Butonu */}
        <TouchableOpacity 
          style={styles.itemTextContainer} 
          onPress={() => toggleTodo(item.id)} // Tıkla: Tamamla
          onLongPress={() => openChangeCategoryModal(item.id)} // Uzun Bas: Kategori Değiştir
        >
          <MaterialIcons
            name={item.completed ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={item.completed ? colors.textSecondary : colors.text}
          />
          <Text style={[
            styles.itemText, 
            item.completed && styles.itemTextCompleted // Üstü çizili stil
          ]}>
            {item.title}
          </Text>
        </TouchableOpacity>
        
        {/* Kategori Adı */}
        <Text style={[styles.itemCategoryName, {color: itemCategory.color}]}>
          {itemCategory.name}
        </Text>
        
        {/* Silme Butonu */}
        <TouchableOpacity 
          onPress={() => deleteTodo(item.id)}
          style={styles.deleteButton}
        >
          <Feather name="trash-2" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    );
  };

  // Input alanının üstündeki yatay kayan kategori seçiciyi render eder.
  const renderCategoryInputSelector = () => (
    <View style={styles.categorySelector}>
      {/* Kategori Yönetim Modalını Açan '+' Butonu */}
      <TouchableOpacity
        onPress={() => setCategoryModalVisible(true)}
        style={styles.manageCategoryButton}
      >
        <Feather name="plus" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.verticalDivider} />
      
      {/* Yatay Kayan Kategori Listesi */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.scrollableCategories}
      >
        {/* "Kategorisiz" seçeneği (her zaman listenin başında) */}
        <TouchableOpacity
          onPress={() => setSelectedCategoryToAdd(null)}
          style={[
            styles.categoryButton, 
            { backgroundColor: UNCATEGORIZED.color },
            (selectedCategoryToAdd === null) && styles.categoryButtonSelected,
          ]}
        >
          <Text style={styles.categoryButtonText}>{t('uncategorized')}</Text>
        </TouchableOpacity>

        {/* Diğer Kategoriler */}
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategoryToAdd(cat.id)}
            style={[
              styles.categoryButton, 
              { backgroundColor: cat.color },
              selectedCategoryToAdd === cat.id && styles.categoryButtonSelected,
            ]}
          >
            <Text style={styles.categoryButtonText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Veri diskten yüklenene kadar bekleme ekranı göster.
  if (!ready) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: colors.background}]}>
        <Text style={{color: colors.text}}>{t('loading')}</Text>
      </View>
    );
  }

  // --- Ana JSX ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={colors.isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Başlık (ve Ayarlar Butonu) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('headerTitle')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('headerSubtitle', { count: filteredTodos.length })}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setSettingsModalVisible(true)}
        >
          <Feather name="settings" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Yatay Kayan Filtreleme Menüsü */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {/* Sabit Filtreler (Tümü, Açık, Tamamlanan) */}
          <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterButton, filter === 'all' && styles.filterButtonSelected]}>
            <View style={styles.filterButtonContent}><Text style={styles.filterButtonText}>{t('filterAll')}</Text><Text style={styles.filterButtonCount}>{filterCounts.all}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('incomplete')} style={[styles.filterButton, filter === 'incomplete' && styles.filterButtonSelected]}>
            <View style={styles.filterButtonContent}><Text style={styles.filterButtonText}>{t('filterOpen')}</Text><Text style={styles.filterButtonCount}>{filterCounts.incomplete}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('completed')} style={[styles.filterButton, filter === 'completed' && styles.filterButtonSelected]}>
            <View style={styles.filterButtonContent}><Text style={styles.filterButtonText}>{t('filterCompleted')}</Text><Text style={styles.filterButtonCount}>{filterCounts.completed}</Text></View>
          </TouchableOpacity>
          
          {/* Kategorisiz Filtresi */}
          <TouchableOpacity onPress={() => setFilter('category_null')} style={[styles.filterButton, { backgroundColor: UNCATEGORIZED.color }, filter === 'category_null' && styles.filterButtonSelected]}>
            <View style={styles.filterButtonContent}><Text style={styles.filterCategoryButtonText}>{t('uncategorized')}</Text><Text style={styles.filterCategoryButtonCount}>{filterCounts.category_null}</Text></View>
          </TouchableOpacity>

          {/* Dinamik Kategori Filtreleri */}
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} onPress={() => setFilter('category_' + cat.id)} style={[styles.filterButton, { backgroundColor: cat.color }, filter === 'category_' + cat.id && styles.filterButtonSelected]}>
              <View style={styles.filterButtonContent}><Text style={styles.filterCategoryButtonText}>{cat.name}</Text><Text style={styles.filterCategoryButtonCount}>{filterCounts['category_' + cat.id]}</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/*
        Klavye açıldığında input alanının ve listenin
        düzgün çalışması için listeyi (FlatList) ve input'u (inputWrapper)
        birlikte sarar.
        Behavior: iOS için 'padding', Android için 'height' kullanılır.
      */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Görev Listesi */}
        <FlatList
          style={{ flex: 1 }} // KAV içinde esnemesi için
          data={filteredTodos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}><Feather name="clipboard" size={50} color={colors.textSecondary} /><Text style={styles.emptyText}>{t('emptyList')}</Text></View>
          }
        />
      
        {/* Görev Ekleme Alanı (KAV içinde) */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputCard}>
            {/* Kategori Seçim Çubuğu */}
            {renderCategoryInputSelector()}
            
            {/* TextInput ve Ekle Butonu */}
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.input} 
                placeholder={t('textInputPlaceholder')} 
                value={text} 
                onChangeText={setText} 
                onSubmitEditing={addTodo} 
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={addTodo} style={styles.addButton}>
                <Feather name="plus" size={24} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>


      {/* AYARLAR MODALI (Sadece Tema ve Dil) */}
      <Modal animationType="slide" visible={settingsModalVisible} onRequestClose={() => setSettingsModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('manageModalTitle')}</Text>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)}><Ionicons name="close" size={28} color={colors.text} /></TouchableOpacity>
          </View>
          
          <ScrollView>
            {/* Tema Ayarları */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('themeTitle')}</Text>
              <View style={styles.themeSelectorContainer}>
                {/* Tema Butonları (Açık, Koyu, Sistem) */}
                <TouchableOpacity 
                  style={[styles.themeButton, themePreference === 'light' && styles.themeButtonSelected]}
                  onPress={() => setThemePreference('light')}
                >
                  <Feather name="sun" size={18} color={themePreference === 'light' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.themeButtonText, themePreference === 'light' && styles.themeButtonTextSelected]}>{t('themeLight')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.themeButton, themePreference === 'dark' && styles.themeButtonSelected]}
                  onPress={() => setThemePreference('dark')}
                >
                  <Feather name="moon" size={18} color={themePreference === 'dark' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.themeButtonText, themePreference === 'dark' && styles.themeButtonTextSelected]}>{t('themeDark')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.themeButton, themePreference === 'system' && styles.themeButtonSelected]}
                  onPress={() => setThemePreference('system')}
                >
                  <Feather name="smartphone" size={18} color={themePreference === 'system' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.themeButtonText, themePreference === 'system' && styles.themeButtonTextSelected]}>{t('themeSystem')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dil Ayarları (Akordiyon Menü) */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('languageTitle')}</Text>
              
              {/* O an seçili dili gösteren ve listeyi açıp kapatan buton */}
              <TouchableOpacity 
                style={styles.languagePickerButton} 
                onPress={() => setShowLanguageList(!showLanguageList)}
              >
                <Text style={styles.languagePickerButtonText}>
                  {currentLanguageName}
                </Text>
                <Feather 
                  name={showLanguageList ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>

              {/* Açılabilir Dil Listesi */}
              {showLanguageList && (
                <View style={styles.languageSelectorContainer}>
                  {/* Dil listesi uzunsa kaydırılabilirlik sağlar */}
                  <FlatList
                    data={SUPPORTED_LANGUAGES}
                    keyExtractor={(item) => item.code}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.languageButton, 
                          language === item.code && styles.languageButtonSelected
                        ]}
                        onPress={() => {
                          setLanguage(item.code);
                          // (Liste otomatik kapanmaz, kullanıcı seçimini görür)
                        }}
                      >
                        <Text style={[
                          styles.languageButtonText, 
                          language === item.code && styles.languageButtonTextSelected
                        ]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* KATEGORİ YÖNETİM MODALI (Ekleme/Silme) */}
      <Modal animationType="slide" visible={categoryModalVisible} onRequestClose={() => setCategoryModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('categoryModalTitle')}</Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}><Ionicons name="close" size={28} color={colors.text} /></TouchableOpacity>
          </View>
          
          <ScrollView>
            {/* Kategori Ekleme Formu */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('manageModalAddNew')}</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder={t('manageModalCategoryName')} 
                value={newCategoryName} 
                onChangeText={setNewCategoryName} 
                placeholderTextColor={colors.textSecondary}
              />
              {/* Renk Paleti */}
              <View style={styles.colorPalette}>
                {COLOR_PALETTE.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorSwatch, { backgroundColor: color }, newCategoryColor === color && styles.colorSwatchSelected]}
                    onPress={() => setNewCategoryColor(color)}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.modalAddButton} onPress={handleAddCategory}>
                <Text style={styles.modalAddButtonText}>{t('manageModalAddButton')}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Mevcut Kategorileri Listeleme/Silme */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('manageModalCurrent')}</Text>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                scrollEnabled={false} // Ana ScrollView içinde olduğu için
                renderItem={({ item }) => (
                  <View style={styles.modalListItem}>
                    <View style={[styles.modalListColor, {backgroundColor: item.color}]} />
                    <Text style={styles.modalListItemText}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCategory(item.id)}><Feather name="trash-2" size={20} color="#e74c3c" /></TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>{t('manageModalEmpty')}</Text>}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* GÖREV KATEGORİSİ DEĞİŞTİRME MODALI (Merkezi) */}
      <Modal
        animationType="fade"
        transparent={true} // Arka planı yarı saydam yapar
        visible={isChangeCategoryModalVisible}
        onRequestClose={closeChangeCategoryModal}
      >
        {/* Arka plana basıldığında modalı kapat */}
        <TouchableWithoutFeedback onPress={closeChangeCategoryModal}>
          <View style={[styles.centeredModalBackdrop, { backgroundColor: colors.modalBackdrop }]}>
            {/* Modal içeriğine basıldığında kapanmayı engelle */}
            <TouchableWithoutFeedback onPress={() => {}}> 
              <View style={styles.centeredModalView}>
                <Text style={styles.centeredModalTitle}>{t('changeCategoryModalTitle')}</Text>
                
                {/* Kategori Seçim Listesi (Kaydırılabilir) */}
                <ScrollView style={styles.categoryChangeList}>
                  {/* Kategorisiz Seçeneği */}
                  <TouchableOpacity
                    style={styles.categoryChangeItem}
                    onPress={() => handleChangeTodoCategory(null)}
                  >
                    <View style={[styles.modalListColor, {backgroundColor: UNCATEGORIZED.color}]} />
                    <Text style={styles.modalListItemText}>{t('uncategorized')}</Text>
                  </TouchableOpacity>
                  {/* Diğer Kategoriler */}
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.categoryChangeItem}
                      onPress={() => handleChangeTodoCategory(cat.id)}
                    >
                      <View style={[styles.modalListColor, {backgroundColor: cat.color}]} />
                      <Text style={styles.modalListItemText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Kapat Butonu */}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeChangeCategoryModal}
                >
                  <Text style={styles.modalCloseButtonText}>{t('modalClose')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

// -----------------------------------------------------------------
// Dinamik Stil Fonksiyonu
// -----------------------------------------------------------------

// 'colors' nesnesini (context'ten gelir) parametre olarak alır
// ve temaya (açık/koyu) duyarlı bir StyleSheet oluşturur.
const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    // Android'de Status Bar çakışmasını engelle
    paddingTop: Platform.OS === 'android' ? 30 : 0 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },

  // Klavye görünümünü saran ana konteyner
  keyboardAvoidingContainer: {
    flex: 1,
  },
  content: { 
    flex: 1
  },
  listContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 10 // Listenin son elemanı input'a yapışmasın
  }, 
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: colors.text
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: colors.textSecondary,
    marginTop: 4 
  },
  settingsButton: {
    padding: 8, // Basma alanını genişlet
  },

  // Filtreleme Stilleri
  filterContainer: { 
    paddingVertical: 10, 
    paddingHorizontal: 20 
  },
  filterButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    marginRight: 8, 
    backgroundColor: colors.input,
    borderWidth: 2, 
    borderColor: 'transparent' // Seçili durum için yer tutar
  },
  filterButtonSelected: { 
    borderColor: colors.text // Seçili filtre
  },
  filterButtonContent: { 
    flexDirection: 'row', 
    alignItems: 'baseline', 
    gap: 5 
  },
  filterButtonText: { 
    color: colors.text,
    fontWeight: '500', 
    fontSize: 13 
  },
  filterButtonCount: { 
    color: colors.textSecondary,
    fontWeight: '400', 
    fontSize: 11 
  },
  filterCategoryButtonText: { 
    color: '#fff', // Renkli butonlarda her zaman beyaz
    fontWeight: '700', 
    fontSize: 13 
  },
  filterCategoryButtonCount: { 
    color: 'rgba(255, 255, 255, 0.7)', // Renkli butonlarda yarı şeffaf beyaz
    fontWeight: '500', 
    fontSize: 11 
  },

  // Boş Liste Stili
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 80 
  },
  emptyText: { 
    color: colors.textSecondary,
    marginTop: 10, 
    fontSize: 16 
  },

  // Görev (Item) Stilleri
  itemContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card,
    paddingVertical: 16, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    marginBottom: 12, 
    // Tema duyarlı gölge
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.isDark ? 0.3 : 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  itemTextContainer: { 
    flex: 1, // Silme butonu sağda kalacak şekilde esner
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  itemText: { 
    fontSize: 16, 
    color: colors.text,
    marginLeft: 12, 
    fontWeight: '500', 
    flexShrink: 1 // Uzun metinlerin sığmasını sağlar
  },
  itemTextCompleted: { 
    textDecorationLine: 'line-through', 
    color: colors.textSecondary,
  },
  itemCategoryName: { 
    fontSize: 11, 
    fontWeight: '600', 
    marginHorizontal: 8, 
    paddingVertical: 5 
  },
  deleteButton: { 
    padding: 8, 
    backgroundColor: 'rgba(231, 76, 60, 0.1)', // Kırmızı (silme) arkaplanı
    borderRadius: 8 
  },

  // Input Alanı Stilleri
  inputWrapper: { 
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // iPhone'larda home bar'dan kaçın
    backgroundColor: colors.background, 
  },
  inputCard: { 
    backgroundColor: colors.card,
    borderRadius: 16, 
    paddingVertical: 12, 
    paddingHorizontal: 8, 
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.isDark ? 0.3 : 0.1,
    shadowRadius: 10,
    elevation: 8 
  },
  categorySelector: { 
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, 
  },
  manageCategoryButton: { 
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: 10,
  },
  verticalDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.borderColor,
    marginHorizontal: 8,
  },
  scrollableCategories: {
    flex: 1, // Kalan alanı doldur
  },
  categoryButton: { 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: 'transparent', 
    marginRight: 8, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  categoryButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 12 
  },
  categoryButtonSelected: { 
    borderColor: 'rgba(0,0,0,0.5)' // Seçili kategori (input için)
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 4,
  },
  input: { 
    flex: 1, 
    height: 50, 
    backgroundColor: colors.input,
    color: colors.text,
    borderRadius: 10, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    marginRight: 10, 
    borderWidth: 1, 
    borderColor: colors.borderColor
  },
  addButton: { 
    width: 50, 
    height: 50, 
    backgroundColor: colors.primary, // Ana renk (context'ten)
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  // Genel Modal Stilleri
  modalContainer: { 
    flex: 1, 
    backgroundColor: colors.background
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.borderColor
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: colors.text
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  modalSectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 15,
    color: colors.text,
  },

  // Kategori Yönetim Modalı Stilleri
  modalInput: { 
    height: 50, 
    backgroundColor: colors.input,
    color: colors.text,
    borderRadius: 10, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: colors.borderColor
  },
  colorPalette: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginVertical: 15 
  },
  colorSwatch: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    margin: 4, 
    borderWidth: 2, 
    borderColor: 'transparent' 
  },
  colorSwatchSelected: { 
    borderColor: 'rgba(0,0,0,0.4)', // Seçili renk
    transform: [{ scale: 1.1 }] 
  },
  modalAddButton: { 
    backgroundColor: colors.primary,
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  modalAddButtonText: { 
    color: colors.background, // Buton metni, arkaplan rengiyle aynı (kontrast)
    fontSize: 16, 
    fontWeight: '600' 
  },
  modalListItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: colors.card,
    borderRadius: 10, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  modalListColor: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    marginRight: 15 
  },
  modalListItemText: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '500', 
    color: colors.text
  },
  modalEmptyText: { 
    textAlign: 'center', 
    color: colors.textSecondary,
    marginTop: 10,
  },

  // Ayarlar Modalı (Tema) Stilleri
  themeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderColor,
    marginHorizontal: 5,
  },
  themeButtonSelected: {
    borderColor: colors.primary, // Seçili tema
  },
  themeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  themeButtonTextSelected: {
    color: colors.text,
  },
  
  // Ayarlar Modalı (Dil) Stilleri
  languagePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderColor,
    backgroundColor: colors.input,
  },
  languagePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  languageSelectorContainer: {
    marginTop: 10,
    borderColor: colors.borderColor,
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 240, // Dil listesi uzarsa kaydırma sağlar
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  languageButtonSelected: {
    backgroundColor: colors.input, // Seçili dil arkaplanı
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  languageButtonTextSelected: {
    color: colors.primary, // Seçili dil metni
    fontWeight: '700',
  },

  // Kategori Değiştirme Modalı (Merkezi) Stilleri
  centeredModalBackdrop: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    // 'backgroundColor' dinamik olarak atanır
  },
  centeredModalView: { 
    margin: 20, 
    backgroundColor: colors.card,
    borderRadius: 20, 
    padding: 25, 
    alignItems: 'center', 
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%', 
    maxHeight: '60%' // Çok fazla kategori varsa kaydırma sağlar
  },
  centeredModalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 15, 
    color: colors.text
  },
  categoryChangeList: { 
    width: '100%' // Modalın genişliğini kullanır
  },
  categoryChangeItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.borderColor,
    width: '100%' 
  },
  modalCloseButton: { 
    marginTop: 20, 
    backgroundColor: colors.input,
    borderRadius: 10, 
    paddingVertical: 10, 
    paddingHorizontal: 20 
  },
  modalCloseButtonText: { 
    color: colors.text,
    fontWeight: '600' 
  },
});