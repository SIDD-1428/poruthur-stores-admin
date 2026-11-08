'use client';

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  deleteField,
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
  Modal,
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
  ZoomOut,
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
  label,
  helper,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  required = false,
  multiline = false,
  numberOfLines = 1,
}: any) => (
  <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.inputWrapper}>
    <View style={styles.fieldHeading}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {required && <Text style={styles.fieldRequired}>Required</Text>}
    </View>
    {!!helper && <Text style={styles.fieldHelper}>{helper}</Text>}
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
    </View>
  </Animated.View>
);

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [image, setImage] = useState("");
  const [imageUrlModalVisible, setImageUrlModalVisible] = useState(false);
  const [imageUrlCopied, setImageUrlCopied] = useState(false);
  const [protext, setProtext] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState<"branded" | "local">("local");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<any[]>([]);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
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
    loadBrands();
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

  const loadBrands = async () => {
    try {
      const snapshot = await getDocs(collection(db, "brands"));
      setBrands(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""))));
    } catch (error) { console.log("Error loading brands:", error); }
  };

  const loadProduct = async () => {
    try {
      const snap = await getDoc(doc(db, "products", id as string));
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setPrice(String(data.price ?? ""));
        setMrp(String(data.mrp ?? data.price ?? ""));
        setStock(String(data.stock || 0));
        setImage(data.image || "");
        setProtext(data.protext || "");
        setCategory(data.category || "");
        setRating(String(data.rating || ""));
        setUnit(data.unit || "");
        setMaxOrderQty(String(data.maxOrderQty || 0));
        setProductType(data.productType === "branded" || data.brandId ? "branded" : "local");
        setBrandId(data.brandId || "");
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
    if (!name || !price || !mrp || !category || Number(mrp) < Number(price) || (productType === "branded" && !brandId)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Missing Information",
        `Please fill all required fields:\n• Product Name\n• MRP (must be ≥ Selling Price)\n• Selling Price\n• Category${productType === "branded" ? "\n• Brand" : ""}`
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, "products", id as string), {
        name,
        mrp: Number(mrp),
        price: Number(price),
        stock: Number(stock) || 0,
        image,
        protext: protext || "",
        category,
        rating: Number(rating) || 0,
        unit: unit || "",
        maxOrderQty: Number(maxOrderQty) || 0,
        productType: deleteField(),
        brandId: productType === "branded" ? brandId : null,
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
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image Section */}
        <Animated.View entering={ZoomIn.delay(100)} style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Product Image</Text>
          <Text style={styles.sectionSubtitle}>This is the photo customers will see. Replace it using your gallery or camera, or remove it.</Text>

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

        {/* Basic Information — frosted glass container */}
        <Animated.View entering={FadeInUp.delay(150)} style={styles.basicGlassWrap}>
          <BlurView intensity={48} tint="light" style={styles.basicGlass}>
            <LinearGradient
              colors={["rgba(255,255,255,0.82)", "rgba(245,247,250,0.58)", "rgba(255,255,255,0.72)"]}
              locations={[0, 0.52, 1]}
              style={styles.basicGlassSheen}
            >
              <View style={styles.basicGlassHeader}>
                <View style={styles.basicGlassIcon}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.textPrimary} />
                </View>
                <View style={styles.basicGlassHeading}>
                  <Text style={styles.basicGlassTitle}>Basic Information</Text>
                  <Text style={styles.basicGlassSubtitle}>Product name, pricing and category</Text>
                </View>
              </View>
          <InputField
            icon="pricetag-outline"
            label="Product name"
            placeholder="Product Name *"
            value={name}
            onChangeText={setName}
            required
          />
          <InputField
            icon="pricetag-outline"
            label="MRP (Maximum Retail Price)"
            placeholder="MRP *"
            value={mrp}
            onChangeText={setMrp}
            keyboardType="decimal-pad"
            required
          />
          <InputField
            icon="currency-inr"
            label="Selling price"
            placeholder="Selling Price *"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            required
          />
          
          {/* Category Dropdown */}
          <Text style={styles.fieldLabelStandalone}>Product category *</Text>
          
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
                  {category || "Choose a category"}
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
                  
                  <ScrollView
                    style={styles.categoryList}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    {categories.map((item, index) => (
                      <TouchableOpacity
                        key={`${item}-${index}`}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCategory(item);
                          setDropdownOpen(false);
                          Haptics.selectionAsync();
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="folder-outline" size={18} color={Colors.muted} />
                        <Text style={styles.dropdownItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

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
                label="New category name"
            helper="Create a category and assign this product to it."
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
              </LinearGradient>
          </BlurView>
        </Animated.View>


        {/* Internal product classification */}
        <Animated.View entering={FadeInUp.delay(175)}>
          <Text style={styles.sectionTitle}>Product Classification</Text>
          <View style={styles.classificationRow}>
            <TouchableOpacity style={[styles.classificationOption, productType === "branded" && styles.classificationOptionActive]} onPress={() => { setProductType("branded"); Haptics.selectionAsync(); }} activeOpacity={0.8}>
              <Ionicons name="pricetag-outline" size={18} color={productType === "branded" ? "#FFFFFF" : Colors.textSecondary} />
              <Text style={[styles.classificationOptionText, productType === "branded" && styles.classificationOptionTextActive]}>Branded</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.classificationOption, productType === "local" && styles.classificationOptionActive]} onPress={() => { setProductType("local"); setBrandId(""); Haptics.selectionAsync(); }} activeOpacity={0.8}>
              <Ionicons name="storefront-outline" size={18} color={productType === "local" ? "#FFFFFF" : Colors.textSecondary} />
              <Text style={[styles.classificationOptionText, productType === "local" && styles.classificationOptionTextActive]}>Local</Text>
            </TouchableOpacity>
          </View>
          {productType === "branded" && <>
            <Text style={styles.fieldLabelStandalone}>Brand *</Text>
            <Text style={styles.fieldHelperStandalone}>Select the brand associated with this product. This is an internal catalogue link.</Text>
            <TouchableOpacity style={styles.brandPicker} onPress={() => { loadBrands(); setBrandDropdownOpen(!brandDropdownOpen); }}>
              <Text style={[styles.brandPickerText, !brandId && styles.brandPickerPlaceholder]}>{brands.find((brand: any) => brand.id === brandId)?.name || "Select a brand"}</Text>
              <Ionicons name={brandDropdownOpen ? "chevron-up" : "chevron-down"} size={19} color={Colors.muted} />
            </TouchableOpacity>
            {brandDropdownOpen && <View style={styles.brandDropdown}>
              {brands.filter((brand: any) => brand.isActive !== false).map((brand: any) => <TouchableOpacity key={brand.id} style={styles.brandDropdownItem} onPress={() => { setBrandId(brand.id); setBrandDropdownOpen(false); }}>
                <Text style={styles.brandDropdownText}>{brand.name}</Text>
                {brand.id === brandId && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
              </TouchableOpacity>)}
              {!brands.some((brand: any) => brand.isActive !== false) && <Text style={styles.brandEmptyText}>No active brands. Add one in Manage Brands.</Text>}
              <TouchableOpacity style={styles.manageBrandsLink} onPress={() => { setBrandDropdownOpen(false); router.push("/brands"); }}>
                <Ionicons name="settings-outline" size={16} color={Colors.textPrimary} /><Text style={styles.manageBrandsText}>Manage Brands</Text>
              </TouchableOpacity>
            </View>}
          </>}
        </Animated.View>

        {/* Inventory Details — frosted glass container */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.inventoryGlassWrap}>
          <BlurView intensity={48} tint="light" style={styles.inventoryGlass}>
            <LinearGradient
              colors={["rgba(255,255,255,0.82)", "rgba(245,247,250,0.58)", "rgba(255,255,255,0.72)"]}
              locations={[0, 0.52, 1]}
              style={styles.inventoryGlassSheen}
            >
              <View style={styles.inventoryGlassHeader}>
                <View style={styles.inventoryGlassIcon}>
                  <Ionicons name="cube-outline" size={20} color={Colors.textPrimary} />
                </View>
                <View style={styles.inventoryGlassHeading}>
                  <Text style={styles.inventoryGlassTitle}>Inventory Details</Text>
                  <Text style={styles.inventoryGlassSubtitle}>Manage stock, order limits and product size</Text>
                </View>
              </View>
              <InputField
                icon="layers-outline"
                label="Available stock"
                helper="How many units are currently available in inventory."
                placeholder="Stock Quantity"
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
              />
              <InputField
                icon="alert-circle-outline"
                label="Maximum order quantity"
                helper="Maximum units one customer can buy in a single order. Enter 0 for no limit."
                placeholder="(0 = No Limit)"
                value={maxOrderQty}
                onChangeText={setMaxOrderQty}
                keyboardType="numeric"
              />
              <InputField
                icon="scale-outline"
                label="Product unit / size"
                helper="Describe the pack size or measurement, e.g. 500 g, 1 kg, 1 litre, or 1 pack."
                placeholder="Unit (500g, 1kg, etc.)"
                value={unit}
                onChangeText={setUnit}
              />
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* Additional Details — frosted glass container */}
        <Animated.View entering={FadeInUp.delay(250)} style={styles.additionalGlassWrap}>
          <BlurView intensity={48} tint="light" style={styles.additionalGlass}>
            <LinearGradient
              colors={["rgba(255,255,255,0.82)", "rgba(245,247,250,0.58)", "rgba(255,255,255,0.72)"]}
              locations={[0, 0.52, 1]}
              style={styles.additionalGlassSheen}
            >
              <View style={styles.additionalGlassHeader}>
                <View style={styles.additionalGlassIcon}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.textPrimary} />
                </View>
                <View style={styles.additionalGlassHeading}>
                  <Text style={styles.additionalGlassTitle}>Additional Details</Text>
                  <Text style={styles.additionalGlassSubtitle}>Description and product rating</Text>
                </View>
              </View>
          <InputField
            icon="document-text-outline"
            label="Product description"
            helper="Short details about the product. This can be shown on the customer product page."
            placeholder="Description"
            value={protext}
            onChangeText={setProtext}
            multiline
            numberOfLines={3}
          />
          <InputField
            icon="star-outline"
            label="Product rating"
            helper="Optional rating from 0 to 5. Leave blank if you do not want to set one."
            placeholder="Rating (0-5)"
            value={rating}
            onChangeText={setRating}
            keyboardType="numeric"
          />
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* Image URL (Advanced) */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.imageUrlSection}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <Text style={styles.fieldLabel}>Image URL</Text>
          <Text style={styles.fieldHelper}>The image URL stays hidden until you choose to view it. Leave it blank when you upload an image above.</Text>
          <TouchableOpacity
            style={styles.imageUrlTrigger}
            activeOpacity={0.82}
            onPress={() => Alert.alert(
              "Image URL",
              "Would you like to view or edit the image URL?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Show URL", onPress: () => { setImageUrlCopied(false); setImageUrlModalVisible(true); } },
              ]
            )}
          >
            <View style={styles.imageUrlTriggerIcon}>
              <Ionicons name="link-outline" size={19} color={Colors.textPrimary} />
            </View>
            <View style={styles.imageUrlTriggerTextWrap}>
              <Text style={styles.imageUrlTriggerTitle}>Show URL</Text>
              <Text style={styles.imageUrlTriggerSubtitle}>{image ? "Image URL is set" : "No image URL added"}</Text>
            </View>
            <Ionicons name="eye-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
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
        <Modal
          visible={imageUrlModalVisible}
          transparent
          statusBarTranslucent
          animationType="none"
          onRequestClose={() => setImageUrlModalVisible(false)}
        >
          <View style={styles.imageUrlModalRoot}>
            <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
            <TouchableOpacity
              style={styles.imageUrlModalBackdrop}
              activeOpacity={1}
              onPress={() => setImageUrlModalVisible(false)}
            />
            <Animated.View entering={ZoomIn.springify().damping(18)} exiting={ZoomOut.duration(160)} style={styles.imageUrlModalCard}>
              <BlurView intensity={65} tint="light" style={styles.imageUrlModalGlass}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.94)", "rgba(245,247,250,0.86)", "rgba(255,255,255,0.92)"]}
                  style={styles.imageUrlModalContent}
                >
                  <View style={styles.imageUrlModalHeader}>
                    <View style={styles.imageUrlModalIcon}>
                      <Ionicons name="link-outline" size={21} color={Colors.textPrimary} />
                    </View>
                    <View style={styles.imageUrlModalHeading}>
                      <Text style={styles.imageUrlModalTitle}>Image URL</Text>
                      <Text style={styles.imageUrlModalSubtitle}>View, edit or copy the image link</Text>
                    </View>
                    <TouchableOpacity onPress={() => setImageUrlModalVisible(false)} style={styles.imageUrlCloseButton}>
                      <Ionicons name="close" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.imageUrlInputLabel}>IMAGE LINK</Text>
                  <TextInput
                    style={styles.imageUrlModalInput}
                    value={image}
                    onChangeText={(value) => { setImage(value); setImageUrlCopied(false); }}
                    placeholder="Paste image URL here"
                    placeholderTextColor={Colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    multiline
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={styles.imageUrlCopyButton}
                    activeOpacity={0.84}
                    disabled={!image.trim()}
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(image.trim());
                        setImageUrlCopied(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch {
                        Alert.alert("Copy failed", "The image URL could not be copied. Please try again.");
                      }
                    }}
                  >
                    <LinearGradient
                      colors={imageUrlCopied ? ["#1F9D62", "#16834F"] : [Colors.primary, Colors.accent]}
                      style={styles.imageUrlCopyGradient}
                    >
                      <Ionicons name={imageUrlCopied ? "checkmark-circle-outline" : "copy-outline"} size={18} color="#FFFFFF" />
                      <Text style={styles.imageUrlCopyText}>{imageUrlCopied ? "Copied to clipboard" : "Copy URL"}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          </View>
        </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fieldHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  fieldLabel: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  fieldRequired: { fontSize: 10, fontWeight: "700", color: Colors.danger, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldHelper: { fontSize: 11, color: Colors.muted, lineHeight: 16, marginBottom: 7 },
  fieldLabelStandalone: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginTop: 4, marginBottom: 5 },
  fieldHelperStandalone: { fontSize: 11, color: Colors.muted, lineHeight: 16, marginBottom: 9 },

  classificationHint: { fontSize: 12, color: Colors.muted, marginBottom: 10, lineHeight: 18 },
  classificationRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  classificationOption: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: Colors.separator, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.surface },
  classificationOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  classificationOptionText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },
  classificationOptionTextActive: { color: "#FFFFFF" },
  brandFieldLabel: { fontSize: 11, letterSpacing: 1, fontWeight: "700", color: Colors.muted, marginBottom: 7, marginTop: 4 },
  brandPicker: { minHeight: 50, borderWidth: 1, borderColor: Colors.separator, borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.card },
  brandPickerText: { fontSize: 14, color: Colors.textPrimary },
  brandPickerPlaceholder: { color: Colors.muted },
  brandDropdown: { borderWidth: 1, borderColor: Colors.separator, borderRadius: 13, marginTop: 7, overflow: "hidden", backgroundColor: Colors.card },
  brandDropdownItem: { minHeight: 44, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: Colors.separator },
  brandDropdownText: { fontSize: 14, color: Colors.textPrimary },
  brandEmptyText: { padding: 14, color: Colors.muted, fontSize: 12 },
  manageBrandsLink: { minHeight: 44, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.surface },
  manageBrandsText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },

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

  // Frosted liquid-glass basic information panel
  basicGlassWrap: {
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 26,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 7,
  },
  basicGlass: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  basicGlassSheen: {
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    borderRadius: 26,
  },
  basicGlassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,116,139,0.14)",
  },
  basicGlassIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },
  basicGlassHeading: {
    flex: 1,
  },
  basicGlassTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  basicGlassSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  // Frosted liquid-glass additional details panel
  additionalGlassWrap: {
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 26,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 7,
  },
  additionalGlass: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  additionalGlassSheen: {
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    borderRadius: 26,
  },
  additionalGlassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,116,139,0.14)",
  },
  additionalGlassIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },
  additionalGlassHeading: { flex: 1 },
  additionalGlassTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  additionalGlassSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  imageUrlSection: { marginBottom: 8 },
  imageUrlTrigger: {
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(245,247,250,0.78)",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  imageUrlTriggerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageUrlTriggerTextWrap: { flex: 1 },
  imageUrlTriggerTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  imageUrlTriggerSubtitle: { fontSize: 11, color: Colors.muted, marginTop: 3 },
  imageUrlModalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(20,25,35,0.16)",
  },
  imageUrlModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageUrlModalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    shadowColor: "#263449",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 18,
  },
  imageUrlModalGlass: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.96)",
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  imageUrlModalContent: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  imageUrlModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 11,
  },
  imageUrlModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.96)",
  },
  imageUrlModalHeading: { flex: 1 },
  imageUrlModalTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  imageUrlModalSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  imageUrlCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.84)",
  },
  imageUrlInputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.muted,
    marginBottom: 8,
  },
  imageUrlModalInput: {
    minHeight: 104,
    maxHeight: 180,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    backgroundColor: "rgba(255,255,255,0.76)",
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  imageUrlCopyButton: { borderRadius: 15, overflow: "hidden" },
  imageUrlCopyGradient: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  imageUrlCopyText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Frosted liquid-glass inventory panel
  inventoryGlassWrap: {
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 26,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 7,
  },
  inventoryGlass: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  inventoryGlassSheen: {
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    borderRadius: 26,
  },
  inventoryGlassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,116,139,0.14)",
  },
  inventoryGlassIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },
  inventoryGlassHeading: {
    flex: 1,
  },
  inventoryGlassTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  inventoryGlassSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
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
  categoryList: {
    maxHeight: 190,
    flexGrow: 0,
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