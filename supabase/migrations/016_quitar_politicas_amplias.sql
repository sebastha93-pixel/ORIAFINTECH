-- QUITAR LAS POLÍTICAS AMPLIAS QUE ANULABAN 015 (auditoría de seguridad 2026-11, informe 14 #26a, ALTA).
--
-- En producción existían tres políticas que no estaban en el repo:
--   "Users see their own transactions" / "... accounts" / "... categories"
--   (FOR ALL, user_id = auth.uid()).
-- Las políticas PERMISSIVE se suman por OR, así que estas anulaban los
-- WITH CHECK de 015_security_hardening.sql:
--   - una transacción podía llevar to_account_id de una cuenta AJENA, y el
--     trigger SECURITY DEFINER movía ese saldo;
--   - un usuario podía crear categorías is_system = true, que ven todos.
--
-- Las políticas granulares de 015 (acc_*, cat_*, txn_* y "System or own
-- categories") ya cubren SELECT, INSERT, UPDATE y DELETE, así que quitarlas no
-- le corta nada legítimo a nadie.
--
-- Comprobado en producción el 13-nov dentro de una transacción revertida, como
-- un usuario real: antes, la transferencia a cuenta ajena y la categoría de
-- sistema PASABAN; después quedan bloqueadas, y el gasto propio, la categoría
-- propia y lo que cada uno ve siguen igual. Antes de aplicar: 0 transacciones
-- contra cuentas ajenas y 0 categorías de sistema creadas por usuarios.
drop policy if exists "Users see their own transactions" on public.transactions;
drop policy if exists "Users see their own accounts" on public.accounts;
drop policy if exists "Users see their own categories" on public.categories;
