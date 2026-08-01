import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { db } from "../firebase/config";
export default function SelectStoreLocation() {
  
  const [region,setRegion]=React.useState({
    latitude:12.9716,
    longitude:77.5946,
    latitudeDelta:0.01,
    longitudeDelta:0.01,
  });

  const [marker,setMarker]=React.useState({
    latitude:12.9716,
    longitude:77.5946,
  });

  const [address,setAddress]=React.useState("");

  const useCurrentLocation=async()=>{
    try{
        const {status}=await Location.requestForegroundPermissionsAsync();
        if(status!=="granted"){
          alert("Location permission denied");
          return;
        }

        const location=await Location.getCurrentPositionAsync({
          accuracy:Location.Accuracy.High,
        });

        const latitude=location.coords.latitude;
        const longitude=location.coords.longitude;

        setMarker({
          latitude,longitude,
        });

        setRegion({
          latitude,
          longitude,
          latitudeDelta:0.01,
          longitudeDelta:0.01,
        });

        const place=await getAddress(
          latitude,
          longitude
        );
        setAddress(place.address);

    }catch(err){
      console.log(err);
      alert("Unable to get Location");
    }
  };

  const getAddress=async(
    latitude:number,
    longitude:number)=>{
      try{
        const result=await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if(result.length>0){
          const place=result[0];
          const fullAddress=[
            place.name,
            place.street,
            place.district,
            place.city,
            place.region,
            place.postalCode,
          ]
          .filter(Boolean)
          .join(",");
        
          setAddress(fullAddress);
          return{
            address:fullAddress,
            pincode:place.postalCode??"",
          };
        }
        return{
          address:"",
          pincode:"",
        };
      }catch{
        return{
          address:"",
          pincode:"",
        };
      }
    };

    const saveLocation=async()=>{
      try{
        const place=await getAddress(
          marker.latitude,
          marker.longitude
        );

        await setDoc(
          doc(db,"settings","delivery"),{
            shopLatitude:marker.latitude,
            shopLongitude:marker.longitude,
            shopAddress:place.address,
            shopPincode:place.pincode,
            radiusKm:5,
            updatedAt:new Date(),
          },{
            merge:true,
          }
        );
        alert("Store location saved!");
        router.back();
      }catch(err){
        console.log(err);
        alert("Failed to save location");
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
          size={26}
          color="#000"
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        Select Store Location
      </Text>

      <MapView style={styles.map}
      region={region}
      onPress={async(e)=>{
        const coordinate=e.nativeEvent.coordinate;
        setMarker(coordinate);
        setRegion({
          latitude:coordinate.latitude,
          longitude:coordinate.longitude,
          latitudeDelta:0.01,
          longitudeDelta:0.01,
        });
        const place=await getAddress(
          coordinate.latitude,
          coordinate.longitude
        );
        setAddress(place.address);
      }}>
        <Marker coordinate={marker}/>       
      </MapView>

      <View style={{
        position:"absolute",
        left:20,
        right:20,
        bottom:140,
        backgroundColor:"#FFF",
        padding:15,
        borderRadius:16,
        elevation:5,
      }}>
        <Text style={{
          fontWeight:"700",
          fontSize:16,
          marginBottom:6,
        }}>
          Selected Address
        </Text>
        <Text>
          {address|| "Tap Use Current Location or select a point on the map"}
        </Text>
      </View>

      {/*usecurrentlocationbutton*/}
      <TouchableOpacity style={styles.currentButton}
      onPress={ useCurrentLocation}>
          <Ionicons name="locate" size={20} color="#FFF"/>
          <Text style={styles.currentText}>
            Use Current Location
          </Text>
      </TouchableOpacity>


      {/*save loaction button*/}
      <TouchableOpacity style={[styles.saveButton,{
        opacity:address?1:0.5,
      },]}
      disabled={!address}
      onPress={saveLocation}>
          <Text style={styles.saveText}>
            Confirm Location
          </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({

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

  map:{
    flex:1,
  },

  currentButton:{
    position:"absolute",
    bottom:80,
    left:20,
    right:20,
    backgroundColor:"#000",
    borderRadius:18,
    paddingVertical:16,
    flexDirection:"row",
    justifyContent:"center",
    alignItems:"center",
  },

  currentText:{
    color:"#FFF",
    fontSize:16,
    fontWeight:"700",
    marginLeft:8,
  },

  saveButton:{
    position:"absolute",
    bottom:20,
    left:20,
    right:20,
    backgroundColor:"#000",
    borderRadius:18,
    paddingVertical:16,
    flexDirection:"row",
    justifyContent:"center",
    alignItems:"center",
  },
  saveText: {
    color:"#FFF",
    fontSize:16,
    fontWeight:"700",
    marginLeft:8,
  },
});