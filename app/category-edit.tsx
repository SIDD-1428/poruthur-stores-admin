import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db, storage } from "../firebase/config";

export default function CategoryEdit(){
    const{id} = useLocalSearchParams();
    const [loading,setLoading]=useState(true);
    const[name,setName]=useState("");
    const [subtitle,setSubtitle]=useState("");
    const[image,setImage]=useState("");
    const[isVisible,setIsVisible]=useState(true);

    useEffect(()=>{
        loadCategory();
    },[]);

    const loadCategory=async()=>{
        try{
            const snap=await getDoc(
                doc(db,"categories",id as string)
            );
            if(!snap.exists()) return;
            const data: any=snap.data();
            setName(data.name??"");
            setSubtitle(data.subtitle??"");
            setImage(data.image??"");
            setIsVisible(data.isVisible??true);
        }catch(e){
            console.log(e);
        }
        setLoading(false);
    };

    const pickImage = async () => {
        try {
            const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permission.status !== "granted") return;

            const result =
            await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled) return;

            const response = await fetch(
            result.assets[0].uri
            );

            const blob = await response.blob();

            const storageRef = ref(
            storage,
            `Categories/${id}`
            );

            await uploadBytes(storageRef, blob);

            const url = await getDownloadURL(storageRef);

            setImage(url);

            } catch (e) {
                console.log(e);
            }
            };

            const saveCategory = async () => {
  try {
    await updateDoc(
      doc(db, "categories", id as string),
      {
        name,
        subtitle,
        image,
        isVisible,
      }
    );

    Alert.alert(
      "Success",
      "Category updated successfully."
    );

    router.back();

  } catch (e) {
    console.log(e);

    Alert.alert(
      "Error",
      "Something went wrong."
    );
  }
};

const deleteCategory = () => {
  Alert.alert(
    "Delete Category?",
    `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            await deleteDoc(
              doc(db, "categories", id as string)
            );

            Alert.alert(
              "Deleted",
              "Category deleted successfully.",
              [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]
            );
          } catch (e) {
            console.log("Delete category error:", e);

            setLoading(false);

            Alert.alert(
              "Delete Failed",
              "Unable to delete the category. Please try again."
            );
          }
        },
      },
    ]
  );
};

if (loading) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
return (
  <View style={styles.container}>
    <LinearGradient
      colors={["#000000", "#333333"]}
      style={styles.header}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color="#FFF"
        />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>
        Edit Category
      </Text>

      <Text style={styles.headerSubtitle}>
        Update category details
      </Text>
    </LinearGradient>

    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      <TouchableOpacity
        style={styles.imageContainer}
        activeOpacity={0.8}
        onPress={pickImage}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
          />
        ) : (
          <View style={{ alignItems: "center" }}>
  <Ionicons
    name="camera-outline"
    size={38}
    color="#999"
  />
  <Text
    style={{
      marginTop: 8,
      color: "#777",
      fontSize: 12,
    }}
  >
    Add Image
  </Text>
</View>
        )}
      </TouchableOpacity>

      <Text style={styles.changeText}>
        Tap to change image
      </Text>

      <Text style={styles.label}>
        Category Name
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Category Name"
      />

      <Text style={styles.label}>
        Subtitle
      </Text>

      <TextInput
        value={subtitle}
        onChangeText={setSubtitle}
        style={[styles.input, { height: 90 }]}
        multiline
        placeholder="Category subtitle"
      />

      <View style={styles.switchCard}>
        <View>
          <Text style={styles.switchTitle}>
            Visible
          </Text>

          <Text style={styles.switchSubtitle}>
            Show this category in the customer app
          </Text>
        </View>

        <Switch
          value={isVisible}
          onValueChange={setIsVisible}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={saveCategory}
      >
        <LinearGradient
          colors={["#000000", "#222222"]}
          style={styles.saveButton}
        >
          <Text style={styles.saveText}>
            Save Changes
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
          activeOpacity={0.9}
          onPress={deleteCategory}
          style={styles.deleteButton}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color="#D32F2F"
          />

          <Text style={styles.deleteText}>
            Delete Category
          </Text>
        </TouchableOpacity>

    </ScrollView>
  </View>
);
}

const styles=StyleSheet.create({
header: {
  paddingTop: 55,
  paddingBottom: 30,
  paddingHorizontal: 20,
  borderBottomLeftRadius: 28,
  borderBottomRightRadius: 28,
},

backButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: "rgba(255,255,255,0.15)",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 20,
},

headerTitle: {
  color: "#FFF",
  fontSize: 30,
  fontWeight: "700",
},

headerSubtitle: {
  color: "#DDD",
  marginTop: 6,
},

content: {
  padding: 20,
},

imageContainer: {
  width: 130,
  height: 130,
  borderRadius: 65,
  alignSelf: "center",
  backgroundColor: "#F4F4F4",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
  marginTop: 10,
},

image: {
  width: "100%",
  height: "100%",
},

changeText: {
  textAlign: "center",
  marginTop: 12,
  marginBottom: 30,
  color: "#666",
},

label: {
  fontWeight: "700",
  fontSize: 15,
  marginBottom: 10,
  marginTop: 12,
},

input: {
  backgroundColor: "#F5F5F5",
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 16,
  fontSize: 16,
  borderWidth: 1,
  borderColor: "#ECECEC",
},

switchCard: {
  marginTop: 25,
  backgroundColor: "#F7F7F7",
  borderRadius: 18,
  padding: 18,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

switchTitle: {
  fontSize: 16,
  fontWeight: "700",
},

switchSubtitle: {
  color: "#666",
  marginTop: 4,
  width: 220,
},

saveButton: {
  height: 58,
  borderRadius: 18,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 35,
  marginBottom: 40,
},
container: {
  flex: 1,
  backgroundColor: "#FFFFFF",
},

saveText: {
  color: "#FFF",
  fontSize: 17,
  fontWeight: "700",
},
deleteButton: {
  height: 56,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#F1CACA",
  backgroundColor: "#FFF5F5",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "row",
  gap: 8,
  marginBottom: 50,
},

deleteText: {
  color: "#D32F2F",
  fontSize: 16,
  fontWeight: "700",
},
});