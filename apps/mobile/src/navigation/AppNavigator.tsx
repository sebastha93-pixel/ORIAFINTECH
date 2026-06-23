import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../store';
import { Colors, Typography, BorderRadius } from '../theme';

// Screens
import { LoginScreen }           from '../screens/auth/LoginScreen';
import { RegisterScreen }        from '../screens/auth/RegisterScreen';
import { DashboardScreen }       from '../screens/dashboard/DashboardScreen';
import { TransactionsScreen }    from '../screens/transactions/TransactionsScreen';
import { AddTransactionScreen }  from '../screens/transactions/AddTransactionScreen';
import { GoalsScreen }           from '../screens/goals/GoalsScreen';
import { AiChatScreen }          from '../screens/ai/AiChatScreen';
import { AnalysisScreen }        from '../screens/analysis/AnalysisScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ─────────────────────────────────────────────
// CUSTOM TAB BAR
// ─────────────────────────────────────────────
function NexoTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <View style={tb.wrapper}>
        <LinearGradient colors={['#0D1628', '#070B14']} style={tb.container}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const isFab = route.name === 'AddTransaction';

            const onPress = () => {
              if (isFab) { setShowAdd(true); return; }
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            if (isFab) {
              return (
                <Pressable
                  key={route.key}
                  style={tb.fabWrap}
                  onPress={onPress}
                  hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                >
                  {({ pressed }) => (
                    <LinearGradient
                      colors={[Colors.accent, Colors.accentDark]}
                      style={[tb.fab, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Ionicons name="add" size={28} color="#fff" />
                    </LinearGradient>
                  )}
                </Pressable>
              );
            }

            const label = (options.tabBarLabel as string) || route.name;
            const icon  = TAB_ICONS[route.name] || 'ellipsis-horizontal';

            return (
              <Pressable
                key={route.key}
                style={tb.tab}
                onPress={onPress}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              >
                {({ pressed }) => (
                  <>
                    <View style={[tb.iconWrap, focused && tb.iconActive, pressed && { opacity: 0.72 }]}>
                      <Ionicons
                        name={(focused ? icon : `${icon}-outline`) as 'home'}
                        size={22}
                        color={focused ? Colors.accent : Colors.textMuted}
                      />
                    </View>
                    <Text style={[tb.label, focused && tb.labelActive]}>{label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </LinearGradient>
      </View>

      {/* Add Transaction modal — lives outside tab bar so it can be full screen */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <AddTransactionScreen
          onClose={() => setShowAdd(false)}
          onSaved={() => setShowAdd(false)}
        />
      </Modal>
    </>
  );
}

const TAB_ICONS: Record<string, string> = {
  Dashboard:    'home',
  Transactions: 'swap-horizontal',
  Analysis:     'bar-chart',
  Goals:        'flag',
  AI:           'sparkles',
};

// ─────────────────────────────────────────────
// MAIN TABS
// ─────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <NexoTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Movimientos' }} />
      <Tab.Screen name="AddTransaction" component={EmptyScreen}      options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Analysis"     component={AnalysisScreen}     options={{ tabBarLabel: 'Análisis' }} />
      <Tab.Screen name="Goals"        component={GoalsScreen}        options={{ tabBarLabel: 'Metas' }} />
      <Tab.Screen name="AI"           component={AiChatScreen}       options={{ tabBarLabel: 'Nexo IA' }} />
    </Tab.Navigator>
  );
}

function EmptyScreen() {
  return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
}

// ─────────────────────────────────────────────
// ROOT NAVIGATOR
// ─────────────────────────────────────────────
export function AppNavigator() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─────────────────────────────────────────────
// TAB BAR STYLES
// ─────────────────────────────────────────────
const tb = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10, paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: {
    width: 40, height: 30, justifyContent: 'center', alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  iconActive: { backgroundColor: Colors.accent + '18' },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.medium },
  labelActive: { color: Colors.accent, fontWeight: Typography.semibold },

  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -20 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.background,
  },
});
