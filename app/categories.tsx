import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { collection, doc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../firebase/config";

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
};

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), async (snapshot) => {
      const batch = writeBatch(db);
      let needsMigration = false;
      const docs = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data();

        if (data.position === undefined) {
          batch.update(docSnap.ref, {
            position: index + 1,
            isVisible: true,
          });
          needsMigration = true;
        }

        return {
          id: docSnap.id,
          ...data,
        };
      });

      if (needsMigration) {
        await batch.commit();
        return;
      }

      docs.sort((a: any, b: any) => a.position - b.position);
      setCategories(docs);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setProducts(data);
    });

    return unsubscribe;
  }, []);

  const moveCategory = async (index: number, direction: "up" | "down") => {
    const newCategories = [...categories];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= newCategories.length) {
      return;
    }

    const current = newCategories[index];
    const target = newCategories[swapIndex];
    const batch = writeBatch(db);

    batch.update(doc(db, "categories", current.id), {
      position: target.position,
    });

    batch.update(doc(db, "categories", target.id), {
      position: current.position,
    });

    try {
      await batch.commit();
      console.log("Category Updated");
    } catch (error) {
      console.log("Move Error", error);
    }
  };

  const toggleVisibility=async(
    category:any
  )=>{
    try{
      await updateDoc(
        doc(db,"categories",category.id),
        {
          isVisible:!category.isVisible,
        }
      );

      console.log("Visibility Updated");
    }catch(error){
      console.log("Visibility error",error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#333"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Arrange how categories appear in the customer app</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={50} color="#999" />
            <Text style={styles.emptyTitle}>No Categories</Text>
            <Text style={styles.emptySub}>Add categories first.</Text>
          </View>
        ) : (
          categories.map((category, index) => {
            const productCount = products.filter((p: any) => p.category === category.name).length;

            return (
              <View key={category.id} style={styles.categoryCard}>
                <TouchableOpacity style={{flex:1}}
                activeOpacity={0.8}
                onPress={()=>router.push({
                  pathname:"/category-edit",
                  params:{
                    id:category.id,
                  },
                })}>

               
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>{productCount} Products</Text>
                  <View style={{flexDirection:"row",marginTop:8,alignItems:"center",}}>
                    <Text style={styles.categoryInfo}>
                      Position #{category.position}
                    </Text>
                    <View style={{marginLeft:10,paddingHorizontal:10,paddingVertical:5,borderRadius:20,backgroundColor:category.isVisible? "#34C75920":"#FF3B3020"}}>
                      <Text style={{color:category.isVisible?"#34C759":"#FF3B30",
                        fontWeight:"600",
                        fontSize:11,
                      }}>
                        {category.isVisible?"Visible":"Hidden"}
                      </Text>
                    </View>
                </View>
                 </TouchableOpacity>

                <View style={{ justifyContent: "space-evenly", alignItems:"center", height: 95,width:34, }}>
                  <TouchableOpacity onPress={()=>toggleVisibility(category)}>
                    <Ionicons name={category.isVisible===false
                      ?"eye-off-outline":"eye-outline"
                    }
                    size={22}
                    color={
                      category.isVisible===false
                      ?"#FF3B30":"#34C759"
                    }/>
    
                  </TouchableOpacity>
                  <TouchableOpacity disabled={index === 0} onPress={() => moveCategory(index, "up")}>
                    <Ionicons
                      name="chevron-up"
                      size={24}
                      color={index === 0 ? "#CCC" : "#000"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={index === categories.length - 1}
                    onPress={() => moveCategory(index, "down")}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={24}
                      color={index === categories.length - 1 ? "#CCC" : "#000"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    color: "#FFF",
    fontSize: 30,
    fontWeight: "700",
  },

  subtitle: {
    color: "#DDD",
    marginTop: 6,
    fontSize: 14,
  },

  emptyCard: {
    marginTop: 30,
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECECEC",
    padding: 40,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "700",
  },

  emptySub: {
    marginTop: 8,
    color: "#777",
    textAlign: "center",
  },

  categoryCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryName: {
    fontSize: 18,
    fontWeight: "700",
  },

  categoryInfo: {
    color: "#777",
    marginTop: 4,
  },

  categoryCount: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontWeight: "600",
  },
});
