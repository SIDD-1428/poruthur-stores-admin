import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../firebase/config";

export default function DeliveryRadius(){
    const[saving,setSaving]=useState(false);
    const [radius,setRadius]=useState(5);

    useEffect(()=>{
        const unsubscribe=onSnapshot(
            doc(db,"settings","delivery"),
            (snapshot)=>{
                if (snapshot.exists()){
                    const data=snapshot.data();
                    setRadius(data.radiusKm??5);
                }
            }
        );
        return unsubscribe;
    },[]);

    const radiusDecrease=()=>{
        if(radius>1){
            setRadius(radius-1);
        }
    };

    const radiusIncrease=()=>{
        if(radius<15){
            setRadius(radius+1)
        }
    }

    const saveRadius=async()=>{
        try{
            setSaving(true);

            await updateDoc(
                doc(db,"settings","delivery"),{
                    radiusKm:radius,
                }
            );
            alert("Delivery radius updated");
            router.back();
        }catch(err){
            console.log(err);
            alert("Failed to update radius");
        }finally{
            setSaving(false);
        }
    };

    return (
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.back}
      onPress={() => router.back()}
    >
      <Ionicons
        name="chevron-back"
        size={22}
        color="#000"
      />
    </TouchableOpacity>

    <Text style={styles.title}>
      Adjust your delivery radius
    </Text>

    <View style={styles.controlCard}>
      <Text style={styles.radiusLabel}>
        Current Radius
      </Text>

      <Text style={styles.currentRadius}>
        {radius} km
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.buttonDecrease}
          onPress={radiusDecrease}
        >
          <Ionicons
            name="remove"
            size={24}
            color="#111"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonIncrease}
          onPress={radiusIncrease}
        >
          <Ionicons
            name="add"
            size={24}
            color="#111"
          />
        </TouchableOpacity>
      </View>
    </View>

    <TouchableOpacity
      style={[styles.saveButton,saving && styles.saveButtonDisabled,]}
      onPress={saveRadius}
      disabled={saving}
    >
      <Text style={styles.saveButtonText}>
        {saving? "Processing...":"Save Radius"}
      </Text>
    </TouchableOpacity>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: 55,
  },

  back: {
    marginLeft: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 30,
  },

  controlCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    borderRadius: 24,
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  radiusLabel: {
    fontSize: 17,
    color: "#666",
  },

  currentRadius: {
    fontSize: 50,
    fontWeight: "700",
    color: "#111",
    marginTop: 10,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "70%",
    marginTop: 35,
  },

  buttonDecrease: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },

  buttonIncrease: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },

  saveButton: {
    width: "90%",
    alignSelf: "center",
    marginTop: 35,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  saveButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },

  saveButtonDisabled:{
    backgroundColor:"#8A8A8A",
  },
});