'use client';

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, {
    useEffect,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
} from "react-native-reanimated";
import { db, storage } from "../firebase/config";

// ── Clean Black/White/Grey Color Scheme ──
const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  muted: "#999999",
  separator: "#E8E8E8",
  primary: "#000000",
  primaryLight: "#00000010",
  accent: "#333333",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
};

const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  required = false,
  multiline = false,
  numberOfLines = 1,
}: any) => (
  <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.inputWrapper}>
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color={Colors.muted} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
      {required && !value && value !== 0 && (
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredText}>Required</Text>
        </View>
      )}
    </View>
  </Animated.View>
);

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [protext, setProtext] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [maxOrderQty, setMaxOrderQty] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Category dropdown states
  const [categories, setCategories] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    loadProduct();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      const data = snapshot.docs.map((doc) => doc.data().name);
      setCategories(data);
      console.log("Loaded Categories:", data);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  };

  const loadProduct = async () => {
    try {
      const snap = await getDoc(doc(db, "products", id as string));
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setPrice(String(data.price || ""));
        setStock(String(data.stock || 0));
        setImage(data.image || "");
        setProtext(data.protext || "");
        setCategory(data.category || "");
        setRating(String(data.rating || ""));
        setUnit(data.unit || "");
        setMaxOrderQty(String(data.maxOrderQty || 0));
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to load product");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `Products/${Date.now()}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      setImage(downloadURL);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Image uploaded successfully");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Image upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission Required", "Gallery access is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission Required", "Camera permission is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    // Check if category already exists
    if (categories.includes(newCategory.trim())) {
      Alert.alert("Error", "Category already exists");
      return;
    }

    setIsAddingCategory(true);
    try {
      const docRef = await addDoc(collection(db, "categories"), {
        name: newCategory.trim(),
        createdAt: serverTimestamp(),
      });

      console.log("Category added with ID:", docRef.id);
      
      // Update local state
      setCategories((prev) => [...prev, newCategory.trim()]);
      setCategory(newCategory.trim());
      setNewCategory("");
      setShowNewCategory(false);
      setDropdownOpen(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Category "${newCategory.trim()}" added successfully`);
    } catch (error: any) {
      console.log("Error adding category:", error);
      
      let errorMessage = "Failed to add category";
      if (error.code === "permission-denied") {
        errorMessage = "Permission denied. Please check Firestore rules.";
      } else if (error.code === "unavailable") {
        errorMessage = "Network error. Please try again.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsAddingCategory(false);
    }
  };

  const updateProduct = async () => {
    if (!name || !price || !category) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Missing Information",
        "Please fill all required fields:\n• Product Name\n• Price\n• Category"
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, "products", id as string), {
        name,
        price: Number(price),
        stock: Number(stock) || 0,
        image,
        protext: protext || "",
        category,
        rating: Number(rating) || 0,
        unit: unit || "",
        maxOrderQty: Number(maxOrderQty) || 0,
        updatedAt: new Date(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Product updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.log(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons name="cube-outline" size={48} color={Colors.muted} />
        </View>
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Edit Product</Text>
            <Text style={styles.headerSubtitle}>Update product details</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image Section */}
        <Animated.View entering={ZoomIn.delay(100)} style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Product Image</Text>
          <Text style={styles.sectionSubtitle}>Update product photo</Text>

          {image ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage("")}
              >
                <Ionicons name="close-circle" size={24} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color={Colors.muted} />
              <Text style={styles.imagePlaceholderText}>No image selected</Text>
            </View>
          )}

          <View style={styles.imageButtons}>
            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={pickFromGallery}
              disabled={isUploading}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F5F5F5"]}
                style={styles.galleryBtnGradient}
              >
                <Ionicons name="images-outline" size={20} color={Colors.primary} />
                <Text style={styles.galleryBtnText}>Gallery</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={takePhoto}
              disabled={isUploading}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F5F5F5"]}
                style={styles.cameraBtnGradient}
              >
                <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                <Text style={styles.cameraBtnText}>Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {isUploading && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.uploadingText}>Uploading image...</Text>
            </View>
          )}
        </Animated.View>

        {/* Basic Information */}
        <Animated.View entering={FadeInUp.delay(150)}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <InputField
            icon="pricetag-outline"
            placeholder="Product Name *"
            value={name}
            onChangeText={setName}
            required
          />
          <InputField
            icon="currency-inr"
            placeholder="Price *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            required
          />
          
          {/* Category Dropdown */}
          <Text style={styles.sectionTitle}>Category *</Text>
          
          {!showNewCategory ? (
            <>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDropdownOpen(!dropdownOpen);
                }}
              >
                <Text style={[styles.dropdownText, category ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder]}>
                  {category || "Select Category"}
                </Text>
                <Ionicons
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.muted}
                />
              </TouchableOpacity>

              {dropdownOpen && (
                <Animated.View entering={FadeInDown.springify()} style={styles.dropdownMenu}>
                  {/* Add New Category Option */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDropdownOpen(false);
                      setShowNewCategory(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.dropdownItemAddText}>Add New Category</Text>
                  </TouchableOpacity>

                  {/* Existing Categories */}
                  {categories.length > 0 && (
                    <View style={styles.dropdownDivider} />
                  )}
                  
                  {categories.map((item, index) => (
                    <TouchableOpacity
                      key={`${item}-${index}`}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory(item);
                        setDropdownOpen(false);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Ionicons name="folder-outline" size={18} color={Colors.muted} />
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}

                  {categories.length === 0 && (
                    <Text style={styles.dropdownEmptyText}>No categories yet. Tap &quot;Add New Category&quot; to create one.</Text>
                  )}
                </Animated.View>
              )}
            </>
          ) : (
            <Animated.View entering={FadeInDown.springify()} style={styles.newCategoryContainer}>
              <InputField
                icon="add-circle-outline"
                placeholder="Enter new category name"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <View style={styles.newCategoryButtons}>
                <TouchableOpacity
                  style={[styles.newCategoryBtn, styles.cancelBtn]}
                  onPress={() => {
                    setShowNewCategory(false);
                    setNewCategory("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.newCategoryBtn, styles.saveCategoryBtn]}
                  onPress={addCategory}
                  disabled={isAddingCategory}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.accent]}
                    style={styles.saveCategoryGradient}
                  >
                    {isAddingCategory ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.saveCategoryText}>Save Category</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Inventory Details */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <Text style={styles.sectionTitle}>Inventory Details</Text>
          <InputField
            icon="layers-outline"
            placeholder="Stock Quantity"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
          />
          <InputField
            icon="alert-circle-outline"
            placeholder="Max Order Quantity (0 = No Limit)"
            value={maxOrderQty}
            onChangeText={setMaxOrderQty}
            keyboardType="numeric"
          />
          <InputField
            icon="scale-outline"
            placeholder="Unit (500g, 1kg, etc.)"
            value={unit}
            onChangeText={setUnit}
          />
        </Animated.View>

        {/* Additional Details */}
        <Animated.View entering={FadeInUp.delay(250)}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          <InputField
            icon="document-text-outline"
            placeholder="Description"
            value={protext}
            onChangeText={setProtext}
            multiline
            numberOfLines={3}
          />
          <InputField
            icon="star-outline"
            placeholder="Rating (0-5)"
            value={rating}
            onChangeText={setRating}
            keyboardType="numeric"
          />
        </Animated.View>

        {/* Image URL (Advanced) */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <InputField
            icon="link-outline"
            placeholder="Image URL (Optional - leave empty if using upload)"
            value={image}
            onChangeText={setImage}
          />
        </Animated.View>

        {/* Update Button */}
        <Animated.View entering={FadeInUp.delay(350)} style={styles.saveButtonWrapper}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={updateProduct}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.muted,
  },

  // Header
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 16,
  },

  // Image Section
  imageSection: {
    marginBottom: 8,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 16,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 4,
  },
  imagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 8,
  },
  imageButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  galleryBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  galleryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  galleryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  cameraBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  cameraBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  cameraBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: Colors.primary,
  },

  // Input Fields
  inputWrapper: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  requiredBadge: {
    backgroundColor: Colors.danger + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.danger,
  },

  // Dropdown Styles
  dropdown: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 15,
  },
  dropdownTextPlaceholder: {
    color: Colors.muted,
  },
  dropdownTextSelected: {
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  dropdownMenu: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
    overflow: "hidden",
    marginBottom: 12,
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  dropdownItemAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.separator,
  },
  dropdownEmptyText: {
    padding: 16,
    textAlign: "center",
    color: Colors.muted,
    fontSize: 13,
  },

  // New Category
  newCategoryContainer: {
    marginBottom: 12,
  },
  newCategoryButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  newCategoryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  saveCategoryBtn: {
    overflow: "hidden",
  },
  saveCategoryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  saveCategoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Save Button
  saveButtonWrapper: {
    marginTop: 24,
  },
  saveButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});