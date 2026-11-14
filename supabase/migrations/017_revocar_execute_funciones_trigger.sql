-- QUITARLE A anon Y authenticated EL EXECUTE DE LAS FUNCIONES DE TRIGGER
-- (auditoría de seguridad 2026-11, informe 14 #26e; aviso del Advisor).
--
-- handle_new_user, update_account_balance y update_updated_at son
-- SECURITY DEFINER y quedaban ejecutables por anon y authenticated vía RPC.
-- Al ser funciones de trigger, Postgres no deja llamarlas directamente, así
-- que el riesgo real es bajo; pero no hay razón para que sean ejecutables.
-- Disparar un trigger NO revisa el EXECUTE de quien hace el INSERT/UPDATE.
--
-- Comprobado en producción el 13-nov en una transacción revertida: después
-- del REVOKE, un usuario inserta su transacción y update_account_balance
-- corre igual (el saldo se mueve).
revoke execute on function public.handle_new_user(),
                         public.update_account_balance(),
                         public.update_updated_at()
  from public, anon, authenticated;
