import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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
// CUSTOM TAB BAR — ORIA Design
// ─────────────────────────────────────────────
function OriaTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={tb.wrapper}>
      <View style={tb.container}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const label = (options.tabBarLabel as string) || route.name;
          const iconBase = TAB_ICONS[route.name] || 'ellipsis-horizontal';
          const iconName = focused ? iconBase : `${iconBase}-outline`;

          return (
            <Pressable
              key={route.key}
              style={({ pressed }) => [
                tb.tab,
                pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
              ]}
              onPress={onPress}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              {/* Active indicator line */}
              <View style={[tb.indicator, focused && tb.indicatorActive]} />

              <View style={[tb.iconWrap, focused && tb.iconActive]}>
                <Ionicons
                  name={iconName as 'home'}
                  size={22}
                  color={focused ? Colors.accent : Colors.textMuted}
                />
              </View>
              <Text style={[tb.label, focused && tb.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TAB_ICONS: Record<string, string> = {
  Dashboard:    'home',
  Transactions: 'list',
  Analysis:     'bar-chart',
  AI:           'sparkles',
  Profile:      'person',
};

// ─────────────────────────────────────────────
// MAIN TABS
// ─────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <OriaTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Movimientos' }} />
      <Tab.Screen name="Analysis"     component={AnalysisScreen}     options={{ tabBarLabel: 'Análisis' }} />
      <Tab.Screen name="AI"           component={AiChatScreen}       options={{ tabBarLabel: 'IA' }} />
      <Tab.Screen name="Goals"        component={GoalsScreen}        options={{ tabBarLabel: 'Metas' }} />
    </Tab.Navigator>
  );
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
// TAB BAR STYLES — ORIA
// ─────────────────────────────────────────────
const TAB_HEIGHT = 58;

const tb = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  container: {
    flexDirection: 'row', alignItems: 'stretch',
    height: TAB_HEIGHT + (Platform.OS === 'ios' ? 20 : 0),
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingTop: 4,
  },
  // 2px top indicator line for active tab
  indicator: {
    position: 'absolute', top: 0, left: 12, right: 12,
    height: 2, borderRadius: 1,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: Colors.accent,
  },
  iconWrap: {
    width: 40, height: 28, justifyContent: 'center', alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  iconActive: { backgroundColor: Colors.accent + '18' },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Typography.fontSansMedium,
    fontWeight: Typography.medium,
  },
  labelActive: {
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
});
