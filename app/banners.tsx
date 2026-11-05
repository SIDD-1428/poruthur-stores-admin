import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { db, storage } from "../firebase/config";

type BannerAction = "none" | "product" | "category" | "url";
type Banner = { id: string; imageUrl: string; active: boolean; actionType: BannerAction; actionTarget: string; uploading?: boolean };
type ProductOption = { id: string; name: string; category?: string; price?: number };

const blankBanner = (): Banner => ({ id: `banner-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, imageUrl: "", active: true, actionType: "none", actionTarget: "" });

export default function ManageBanners() {
  const [enabled, setEnabled] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productPickerBannerId, setProductPickerBannerId] = useState<string | null>(null);

  useEffect(() => onSnapshot(doc(db, "settings", "homeBanners"), (snap) => {
    const data = snap.data();
    setEnabled(data?.enabled === true);
    setBanners((Array.isArray(data?.banners) ? data.banners : []).slice(0,5).map((b: any, i: number) => ({
      id: String(b.id ?? `banner-${i}`), imageUrl: String(b.imageUrl ?? ""), active: b.active !== false,
      actionType: ["none","product","category","url"].includes(b.actionType) ? b.actionType : "none",
      actionTarget: String(b.actionTarget ?? "")
    })));
    setLoading(false);
  }, (error) => { console.log("Banner settings listener:", error); setLoading(false); }), []);

  useEffect(() => onSnapshot(collection(db, "products"), (snapshot) => {
    setProducts(snapshot.docs.map((productDoc) => {
      const data = productDoc.data();
      return { id: productDoc.id, name: String(data.name ?? "Unnamed product"), category: data.category ? String(data.category) : undefined, price: typeof data.price === "number" ? data.price : undefined };
    }).sort((a, b) => a.name.localeCompare(b.name)));
    setProductsLoading(false);
  }, (error) => { console.log("Product picker listener:", error); setProductsLoading(false); }), []);

  const update = (id: string, patch: Partial<Banner>) => setBanners(current => current.map(b => b.id === id ? { ...b, ...patch } : b));

  const chooseImage = async (banner: Banner) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Permission required", "Allow photo library access to select a banner."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [3,1], quality: 0.82
    });
    if (result.canceled || !result.assets[0]) return;
    update(banner.id, { uploading: true });
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const path = `Banners/${banner.id}-${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const imageUrl = await getDownloadURL(storageRef);
      update(banner.id, { imageUrl, uploading: false });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log("Banner upload failed:", error);
      update(banner.id, { uploading: false });
      Alert.alert("Upload failed", "Could not upload this banner. Please try again.");
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    setBanners(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (banners.some(b => b.uploading)) { Alert.alert("Please wait", "A banner image is still uploading."); return; }
    if (banners.some(b => !b.imageUrl)) { Alert.alert("Missing image", "Upload an image or remove the empty banner before saving."); return; }
    if (banners.some(b => b.actionType !== "none" && !b.actionTarget.trim())) { Alert.alert("Missing destination", "Add a destination for each banner action, or choose No action."); return; }
    if (banners.some(b => b.actionType === "product" && !products.some(product => product.id === b.actionTarget))) { Alert.alert("Select a product", "Choose a valid product from the product search list for every product banner."); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "homeBanners"), {
        enabled,
        banners: banners.slice(0,5).map((b, position) => ({
          id: b.id, imageUrl: b.imageUrl, active: b.active, position,
          actionType: b.actionType, actionTarget: b.actionType === "none" ? "" : b.actionTarget.trim()
        })),
        updatedAt: serverTimestamp()
      }, { merge: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Promotional banners have been updated on the customer app.");
    } catch (error) {
      console.log("Saving banners failed:", error);
      Alert.alert("Save failed", "Could not update banner settings. Check your admin access and try again.");
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#111" /></View>;

  return <View style={styles.page}>
    <LinearGradient colors={["#000000","#333333"]} style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
      <View style={{flex:1}}><Text style={styles.title}>Promotional Banners</Text><Text style={styles.subtitle}>Manage offers shown on the customer home page</Text></View>
    </LinearGradient>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.toggleCard}>
        <View style={{flex:1}}><Text style={styles.label}>Display banners</Text><Text style={styles.hint}>Turn off to hide the entire slider from customers</Text></View>
        <Switch value={enabled} onValueChange={setEnabled} trackColor={{false:"#D5D5D5",true:"#333"}} />
      </View>
      <View style={styles.sectionHead}><View style={{flex:1}}><Text style={styles.sectionTitle}>Your banners</Text><Text style={styles.hint}>{banners.length} of 5 slots used · Recommended image ratio 3:1</Text></View><Text style={styles.count}>{banners.length}/5</Text></View>
      {banners.map((banner, index) => <View key={banner.id} style={styles.card}>
        <View style={styles.cardTop}><Text style={styles.cardTitle}>Banner {index+1}</Text><View style={{flexDirection:"row",alignItems:"center",gap:12}}><Text style={styles.hint}>Show</Text><Switch value={banner.active} onValueChange={value => update(banner.id,{active:value})} trackColor={{false:"#DDD",true:"#333"}}/><TouchableOpacity onPress={() => Alert.alert("Remove banner?","This removes it from the slideshow.",[{text:"Keep",style:"cancel"},{text:"Remove",style:"destructive",onPress:()=>setBanners(current=>current.filter(b=>b.id!==banner.id))}])}><Ionicons name="trash-outline" size={20} color="#D33"/></TouchableOpacity></View></View>
        <TouchableOpacity style={styles.imagePicker} onPress={() => void chooseImage(banner)} disabled={banner.uploading}>
          {banner.uploading ? <ActivityIndicator color="#111"/> : banner.imageUrl ? <Image source={{uri:banner.imageUrl}} style={styles.preview} resizeMode="cover"/> : <><Ionicons name="image-outline" size={28} color="#888"/><Text style={styles.hint}>Choose banner image · 3:1</Text></>}
        </TouchableOpacity>
        <Text style={styles.fieldLabel}>When tapped</Text>
        <View style={styles.actions}>{([{value:"none",label:"No action"},{value:"product",label:"Product"},{value:"category",label:"Category"},{value:"url",label:"Website"}] as const).map(option=><TouchableOpacity key={option.value} onPress={()=>{ update(banner.id,{actionType:option.value,actionTarget:option.value===banner.actionType?banner.actionTarget:""}); setProductSearch(""); setProductPickerBannerId(null); }} style={[styles.actionChip,banner.actionType===option.value&&styles.actionSelected]}><Text style={[styles.actionText,banner.actionType===option.value&&styles.actionTextSelected]}>{option.label}</Text></TouchableOpacity>)}</View>
        {banner.actionType === "product" ? (() => {
          const selectedProduct = products.find(product => product.id === banner.actionTarget);
          const matchingProducts = products.filter(product =>
            product.name.toLowerCase().includes(productSearch.trim().toLowerCase()) ||
            product.category?.toLowerCase().includes(productSearch.trim().toLowerCase())
          ).slice(0, 12);
          return (
            <View style={styles.productPicker}>
              {selectedProduct && productPickerBannerId !== banner.id ? (
                <View style={styles.selectedProduct}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.hint}>{selectedProduct.category || "Product"}{selectedProduct.price !== undefined ? ` · ₹${selectedProduct.price}` : ""}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setProductSearch(""); setProductPickerBannerId(banner.id); }}>
                    <Text style={styles.changeProductText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    value={productSearch}
                    onChangeText={setProductSearch}
                    onFocus={() => setProductPickerBannerId(banner.id)}
                    placeholder="Search products by name..."
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  {productPickerBannerId === banner.id && (
                    <View style={styles.productResults}>
                      {productsLoading ? (
                        <ActivityIndicator color="#111" style={{ padding: 14 }} />
                      ) : matchingProducts.length > 0 ? matchingProducts.map(product => (
                        <TouchableOpacity key={product.id} style={styles.productResult} onPress={() => {
                          update(banner.id, { actionTarget: product.id });
                          setProductSearch("");
                          setProductPickerBannerId(null);
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.productResultName}>{product.name}</Text>
                            <Text style={styles.hint}>{product.category || "Uncategorised"}{product.price !== undefined ? ` · ₹${product.price}` : ""}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color="#888" />
                        </TouchableOpacity>
                      )) : (
                        <Text style={styles.noProducts}>No matching products found.</Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })() : banner.actionType !== "none" ? (
          <TextInput value={banner.actionTarget} onChangeText={value=>update(banner.id,{actionTarget:value})} placeholder={banner.actionType==="category"?"Enter exact category name":"Paste https:// promotional link"} autoCapitalize="none" style={styles.input}/>
        ) : null}
        <View style={styles.reorder}><TouchableOpacity disabled={index===0} onPress={()=>move(index,-1)} style={styles.orderButton}><Ionicons name="arrow-up" size={17} color={index===0?"#CCC":"#222"}/><Text style={styles.orderText}>Move up</Text></TouchableOpacity><TouchableOpacity disabled={index===banners.length-1} onPress={()=>move(index,1)} style={styles.orderButton}><Ionicons name="arrow-down" size={17} color={index===banners.length-1?"#CCC":"#222"}/><Text style={styles.orderText}>Move down</Text></TouchableOpacity></View>
      </View>)}
      {banners.length<5&&<TouchableOpacity style={styles.addButton} onPress={()=>setBanners(current=>[...current,blankBanner()])}><Ionicons name="add-circle-outline" size={21} color="#111"/><Text style={styles.addText}>Add banner</Text></TouchableOpacity>}
      <TouchableOpacity style={styles.saveButton} onPress={()=>void save()} disabled={saving}>{saving?<ActivityIndicator color="#FFF"/>:<><Ionicons name="save-outline" size={19} color="#FFF"/><Text style={styles.saveText}>Save banner settings</Text></>}</TouchableOpacity>
      <Text style={styles.footnote}>Changes sync to the customer app automatically. Maximum 5 banners. Use 1200 × 400 px images for best results.</Text>
    </ScrollView>
  </View>;
}

const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:"#F7F7F7"},center:{flex:1,justifyContent:"center",alignItems:"center"},
 header:{paddingTop:52,paddingBottom:22,paddingHorizontal:18,flexDirection:"row",alignItems:"center",gap:12,borderBottomLeftRadius:24,borderBottomRightRadius:24},
 back:{width:40,height:40,borderRadius:12,backgroundColor:"#FFFFFF22",alignItems:"center",justifyContent:"center"},
 title:{fontSize:22,fontWeight:"800",color:"#FFF"},subtitle:{fontSize:12,color:"#DDD",marginTop:4},
 content:{padding:16,paddingBottom:40},toggleCard:{backgroundColor:"#FFF",borderRadius:16,padding:16,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#E8E8E8",marginBottom:22},
 label:{fontSize:16,fontWeight:"700",color:"#111"},hint:{fontSize:12,color:"#888",marginTop:4},sectionHead:{flexDirection:"row",alignItems:"center",marginBottom:12},sectionTitle:{fontSize:19,fontWeight:"800",color:"#111"},count:{fontSize:14,fontWeight:"700",color:"#555"},
 card:{backgroundColor:"#FFF",borderRadius:16,padding:14,marginBottom:14,borderWidth:1,borderColor:"#E8E8E8"},cardTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},cardTitle:{fontSize:16,fontWeight:"700",color:"#111"},
 imagePicker:{height:116,borderRadius:12,backgroundColor:"#F3F3F3",alignItems:"center",justifyContent:"center",overflow:"hidden",borderWidth:1,borderColor:"#E5E5E5",borderStyle:"dashed"},preview:{width:"100%",height:"100%"},
 fieldLabel:{fontSize:13,fontWeight:"700",color:"#333",marginTop:14,marginBottom:8},actions:{flexDirection:"row",flexWrap:"wrap",gap:7},actionChip:{paddingHorizontal:11,paddingVertical:8,borderRadius:18,backgroundColor:"#F2F2F2"},actionSelected:{backgroundColor:"#222"},actionText:{fontSize:12,color:"#444",fontWeight:"600"},actionTextSelected:{color:"#FFF"},
 input:{borderWidth:1,borderColor:"#DDD",borderRadius:10,padding:12,marginTop:10,fontSize:13,color:"#111"},productPicker:{marginTop:2},selectedProduct:{flexDirection:"row",alignItems:"center",backgroundColor:"#F5F5F5",borderRadius:10,padding:12,marginTop:8},selectedProductName:{fontSize:14,fontWeight:"700",color:"#111"},changeProductText:{fontSize:13,fontWeight:"700",color:"#333",padding:8},productResults:{maxHeight:230,borderWidth:1,borderColor:"#E5E5E5",borderRadius:10,marginTop:6,backgroundColor:"#FFF"},productResult:{flexDirection:"row",alignItems:"center",padding:12,borderBottomWidth:1,borderBottomColor:"#EEE"},productResultName:{fontSize:13,fontWeight:"600",color:"#111"},noProducts:{fontSize:12,color:"#888",textAlign:"center",padding:16},reorder:{flexDirection:"row",gap:18,marginTop:12},orderButton:{flexDirection:"row",alignItems:"center",gap:5,paddingVertical:5},orderText:{fontSize:12,color:"#333"},
 addButton:{borderWidth:1,borderStyle:"dashed",borderColor:"#AAA",borderRadius:14,padding:15,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:8,marginBottom:14},addText:{fontSize:14,fontWeight:"700",color:"#111"},
 saveButton:{backgroundColor:"#111",borderRadius:14,minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9},saveText:{color:"#FFF",fontWeight:"700",fontSize:15},footnote:{fontSize:11,color:"#888",lineHeight:17,textAlign:"center",marginTop:14}
});
