import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert
} from "react-native";
import { db } from "../firebase/config";


export default function managePincodes(){
    const[pincode,setPincode]=useState("");
    const[pincodes,setPincodes]=useState<string[]>([]);
    useEffect(()=>{
        const unsubscribe=onSnapshot(
            doc(db,"settings","delivery"),
            (snapshot)=>{
                if(snapshot.exists()){
                    const data=snapshot.data();
                    setPincodes(data.serviceablePincodes||[]);
                }
            }
        );
        return unsubscribe;
    },[]);

    const addPincode=async()=>{
        const pin=pincode.trim();

        if(!/^\d{6}$/.test(pin)){
            alert("Enter a valid 6-digit pincode");
            return;
        }

        if(pincodes.includes(pin)){
            alert("Pincode already exists");
            return;
        }
        Alert.alert("Add pincode",
            `Do you want to add ${pin} as a serviceable pincode?`,
            [
                {
                    text:"Cancel",
                    style: "cancel",
                },

                {
                    text:"Add",
                    onPress: async()=>{
                        try{
                            await updateDoc(
                                doc(db,"settings","delivery"),{
                                    serviceablePincodes:arrayUnion(pin),
                                }
                            );
                            alert("Pincode added successfully");
                            setPincode("");
                        }catch(err){
                            console.log(err);
                            alert("Failed to add pincode");
                        }
                    }
                }
            ]
        )
    };

    const deletePincode=async(pin:string)=>{
        Alert.alert("Delete Pincode",
            `Remove ${pin} from the delivery area?`,
            [
                {
                    text:"Cancel",
                    style:"cancel",
                },
                {
                    text:"Delete",
                    style:"destructive",
                    onPress:async()=>{
                        try{
                            await updateDoc(
                                doc(db,"settings","delivery"),{
                                    serviceablePincodes:arrayRemove(pin),
                                }
                            );
                            ("Delivery pincode deleted");
                        }catch(err){
                            console.log(err)
                            alert("Failed to delete pincode");
                        }
                    }
                }
            ]
        )
        
    };



    return(
        <View style={styles.container}>

            <TouchableOpacity style={styles.back}
            onPress={()=>router.back()}>
                <Ionicons name="chevron-back" size={26} color="#000"/>
            </TouchableOpacity>

            <Text style={styles.title}>
                    Enter serviceable pincodes
            </Text>
            <View style={styles.inputRow}>
                <TextInput
                style={styles.input}
                placeholder="Enter 6-digit pincode"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}/>

                <TouchableOpacity style={styles.addButton}
                onPress={addPincode}>
                    <Ionicons name="add" size={24} color="#FFF"/>
                </TouchableOpacity>
            </View>            
            {pincodes.map((pin)=>(
                <View key={pin} style={styles.pinCard}>
                    <Text style={styles.pinText}>
                        {pin}
                    </Text>

                    <TouchableOpacity onPress={()=>deletePincode(pin)}>
                        <Ionicons name="trash-outline" size={22} color="#FF3B30"/>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

const styles=StyleSheet.create({
    container:{
    flex:1,
    backgroundColor:"#FFF",
  },

  back:{
    marginTop:55,
    marginLeft:20,
  },
  title:{
    fontSize:28,
    fontWeight:"700",
    marginHorizontal:20,
    marginTop:20,
    marginBottom:20,
  },
  inputRow: {
  flexDirection: "row",
  alignItems: "center",
  marginHorizontal: 20,
  marginBottom: 25,
},

input: {
  flex: 1,
  borderWidth: 1,
  borderColor: "#E5E5E5",
  borderRadius: 15,
  paddingHorizontal: 16,
  height: 52,
  fontSize: 16,
  backgroundColor: "#FFF",
},

addButton: {
  width: 52,
  height: 52,
  borderRadius: 15,
  backgroundColor: "#000",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 12,
},

pinCard: {
  marginHorizontal: 20,
  marginBottom: 12,
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ECECEC",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#FFF",
},

pinText: {
  fontSize: 17,
  fontWeight: "600",
},
});