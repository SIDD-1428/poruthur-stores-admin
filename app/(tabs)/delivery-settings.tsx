import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const Colors={
    background:"#FFFFFF",
    card:"#FFFFFF",
    separator:"#ECECEC",
    primary:"#000",
    muted:"#777",
};

export default function Delivery(){
    return(
        <View style={styles.container}>
            <LinearGradient colors={["#000","#333"]}
            style={styles.header}>
                <Text style={styles.title}>
                    Delivery
                </Text>

                <Text style={styles.subtitle}>
                    Manage Delivery Settings
                </Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={{padding:16,}}>


                {/*Store*/}
                <TouchableOpacity style={styles.card}
                onPress={()=>router.push("/select-shop-loaction")}>
                    <View>
                        <Text style={styles.cardTitle}>
                            Store Location
                        </Text>
                        <Text style={styles.cardSub}>
                            Not configured
                        </Text>
                    </View>

                    <Ionicons name="location-outline" size={28} color="#000"/>
                </TouchableOpacity>



                {/*Custom Radius settingf*/}
                <TouchableOpacity style={styles.card}
                onPress={()=>router.push("/setDeliveryRadius")}>
                    <View >
                        <Text style={styles.cardTitle}>
                            Set delivery radius
                        </Text>
                        <Text style={styles.cardSub}>
                            5 km
                        </Text>
                    </View>
                    <Ionicons name="radio-outline" size={28} color="#000"/>
                </TouchableOpacity>

                {/*Custom pincode Setting*/}
                <TouchableOpacity style={styles.card}
                onPress={()=>router.push("/manage-pincodes")}>
                    <View>
                        <Text style={styles.cardTitle}>
                            Serviceable Pincodes
                        </Text>
                        <Text style={styles.cardSub}>
                            Manage Delivery Areas
                        </Text>
                    </View>
                    <Ionicons name="mail-outline" size={28} color="#000"/>
                </TouchableOpacity>

                {/*Contact*/}
                <TouchableOpacity style={styles.card}>
                    <View>
                        <Text style={styles.cardTitle}>
                            Store Contact
                        </Text>
                        <Text style={styles.cardSub}>
                            Phone & Whatsapp
                        </Text>
                    </View>
                    <Ionicons name="call-outline" size={28} color="#000"/>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles=StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:Colors.background,
    },

    header:{
        paddingTop:55,
        paddingBottom:28,
        paddingHorizontal:20,
        borderBottomLeftRadius:28,
        borderBottomRightRadius:28,
    },

    title:{
        color:"#FFF",
        fontSize:30,
        fontWeight:"700",
    },

    subtitle:{
        color:"#DDD",
        marginTop:6,
    },

    card:{
        backgroundColor:"#FFF",
        borderRadius:18,
        padding:20,
        marginBottom:15,
        borderWidth:1,
        borderColor:Colors.separator,
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
    },

    cardTitle:{
        fontSize:18,
        fontWeight:"700",
    },

    cardSub:{
        marginTop:5,
        color:"#777",
    },
});
