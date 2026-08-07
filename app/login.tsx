import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
    signInWithEmailAndPassword,
} from "firebase/auth";
import {
    doc,
    getDoc,
} from "firebase/firestore";
import React, {
    useEffect,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import { auth, db } from "../firebase/config";

// ── Clean White/Grey/Black Color Scheme ──
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
    danger: "#FF3B30",
    warning: "#FF9500",
};

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Animation values
    const fadeAnim = useSharedValue(0);
    const slideAnim = useSharedValue(50);

    useEffect(() => {
        fadeAnim.value = withTiming(1, { duration: 800 });
        slideAnim.value = withTiming(0, { duration: 600 });
    }, []);

    const animatedFormStyle = useAnimatedStyle(() => ({
        opacity: fadeAnim.value,
        transform: [{ translateY: slideAnim.value }],
    }));

    const login = async () => {
        if (!email || !password) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Missing Information", "Please enter both email and password");
            return;
        }

        setIsLoading(true);
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const uid = credential.user.uid;

            console.log("AUTH UID:", uid);
            console.log("AUTH EMAIL:", credential.user.email);

            const adminDoc = await getDoc(doc(db, "admins", uid));

            if (!adminDoc.exists() || adminDoc.data().email !== credential.user.email) {
                await auth.signOut();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                    "Access Denied",
                    "You are not an authorized admin."
                );
                setIsLoading(false);
                return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Admin Login Successful");
            router.replace("/(tabs)/dashboard");
        } catch (error: any) {
            let message = "Login Failed";
            if (error.code === 'auth/invalid-email') message = "Invalid email address";
            if (error.code === 'auth/user-not-found') message = "No account found with this email";
            if (error.code === 'auth/wrong-password') message = "Incorrect password";
            if (error.code === 'auth/too-many-requests') message = "Too many attempts. Try again later";
            Alert.alert("Login Failed", message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.contentContainer}>
                {/* Decorative Elements */}
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                <Animated.View style={[styles.formContainer, animatedFormStyle]}>
                    {/* Brand Header */}
                    <Animated.View entering={ZoomIn.delay(100)} style={styles.brandContainer}>
                        <View style={styles.brandIcon}>
                            <Ionicons name="shield-checkmark-outline" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.brandName}>Poruthur Stores</Text>
                        <Text style={styles.brandTagline}>Store Management Dashboard</Text>
                    </Animated.View>

                    {/* Welcome Section */}
                    <Animated.View entering={FadeInDown.delay(150)} style={styles.welcomeSection}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to manage your store</Text>
                    </Animated.View>

                    {/* Login Form */}
                    <Animated.View entering={FadeInUp.delay(200)}>
                        <InputField
                            placeholder="admin@store.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.muted} />}
                        />

                        <InputField
                            placeholder="••••••••"
                            secure={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.muted} />}
                            rightIcon={
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={Colors.muted}
                                    />
                                </TouchableOpacity>
                            }
                        />
                    </Animated.View>

                    {/* Login Button */}
                    <Animated.View entering={FadeInUp.delay(250)} style={styles.buttonContainer}>
                        <PrimaryButton
                            title={isLoading ? "Authenticating..." : "Sign In"}
                            onPress={login}
                            disabled={isLoading}
                        />
                        {isLoading && (
                            <ActivityIndicator
                                style={styles.loader}
                                size="small"
                                color={Colors.primary}
                            />
                        )}
                    </Animated.View>

                    {/* Divider */}
                    <Animated.View entering={FadeInUp.delay(300)} style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.or}>Secure Access</Text>
                        <View style={styles.line} />
                    </Animated.View>

                    {/* Admin Info */}
                    <Animated.View entering={FadeInUp.delay(350)} style={styles.adminInfo}>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle-outline" size={20} color={Colors.muted} />
                            <Text style={styles.infoText}>
                                Authorized personnel only
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Ionicons name="shield-outline" size={20} color={Colors.muted} />
                            <Text style={styles.infoText}>
                                All actions are logged
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Footer */}
                    <Animated.View entering={FadeInUp.delay(400)} style={styles.footer}>
                        <Text style={styles.footerText}>
                        </Text>
                    </Animated.View>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    contentContainer: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },

    // Decorative Elements
    decorCircle1: {
        position: "absolute",
        top: -100,
        right: -100,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: Colors.primary,
        opacity: 0.03,
    },
    decorCircle2: {
        position: "absolute",
        bottom: -100,
        left: -100,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: Colors.primary,
        opacity: 0.03,
    },

    // Form Container
    formContainer: {
        backgroundColor: Colors.card,
        borderRadius: 32,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: Colors.separator,
    },

    // Brand
    brandContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    brandIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    brandName: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    brandTagline: {
        fontSize: 12,
        color: Colors.muted,
        marginTop: 4,
    },

    // Welcome Section
    welcomeSection: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: Colors.textPrimary,
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: "center",
    },

    // Button Container
    buttonContainer: {
        marginTop: 24,
        marginBottom: 20,
    },
    loader: {
        marginTop: 12,
    },

    // Divider
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.separator,
    },
    or: {
        marginHorizontal: 12,
        fontSize: 12,
        color: Colors.muted,
        fontWeight: "500",
    },

    // Admin Info
    adminInfo: {
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: Colors.surface,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: "500",
    },

    // Footer
    footer: {
        alignItems: "center",
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
    },
    footerText: {
        fontSize: 11,
        color: Colors.muted,
    },
});