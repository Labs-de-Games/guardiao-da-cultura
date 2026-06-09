# Plano de Implementação: Roteamento Baseado em Roles (Player vs. Institution)

Este documento descreve as etapas necessárias para implementar a separação de rotas e o redirecionamento automático entre jogadores e instituições.

---

## 🎯 Objetivo
Garantir que:
1. Usuários com a role `institution` (ou `admin`) **nunca** vejam a tela do jogo e sejam redirecionados automaticamente para o painel de instituição (`/institution`).
2. Usuários com a role `player` **nunca** consigam acessar as rotas `/institution/*` (já garantido pelo `InstitutionGuard`) e fiquem retidos no jogo (`/`).
3. O fluxo de login redirecione o usuário de forma inteligente logo após a autenticação bem-sucedida.

---

## 🛠️ Alterações Sugeridas

### 📋 Resumo das Tarefas
1. **Criar um novo `PlayerGuard`** no frontend para proteger a rota do jogo de acessos de instituições/admins.
2. **Atualizar a Home Page (`/`)** para utilizar o novo `PlayerGuard` em vez do `AuthGuard` genérico.
3. **Modificar o fluxo de login no `AuthContext`** para que o redirecionamento inicial consulte a role do usuário.

---

## 💻 Código das Alterações (Diffs e Novos Arquivos)

### Passo 1: Criar o `PlayerGuard`
Crie um novo arquivo de Guard no frontend para garantir que apenas jogadores acessem a página do jogo.

**Novo Arquivo:** `front/src/components/auth/PlayerGuard.tsx`

```typescript
"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/lib/auth/useAuth";

interface PlayerGuardProps {
  children: ReactNode;
}

export default function PlayerGuard({ children }: PlayerGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role === "institution" || user?.role === "admin") {
        // Se for instituição ou admin, envia para a área institucional
        router.push("/institution");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Se não estiver autenticado ou se for de outra role, bloqueia a renderização
  if (
    !isAuthenticated ||
    user?.role === "institution" ||
    user?.role === "admin"
  ) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
```

---

### Passo 2: Atualizar a Página Inicial (`/`)
Substitua o `AuthGuard` pelo novo `PlayerGuard` na página raiz para redirecionar instituições automaticamente.

**Arquivo:** [front/src/app/page.tsx](file:///Users/ytower/Code/bolder/gameplate/front/src/app/page.tsx)

```diff
-import AuthGuard from "@/components/auth/AuthGuard";
+import PlayerGuard from "@/components/auth/PlayerGuard";
 import PhaserGame from "../components/PhaserGame";
 
 export default function HomePage() {
   return (
-    <AuthGuard>
+    <PlayerGuard>
       <PhaserGame />
-    </AuthGuard>
+    </PlayerGuard>
   );
 }
```

---

### Passo 3: Ajustar o redirecionamento pós-login no `AuthContext`
Altere o redirecionamento pós-autenticação no client-side para que ele verifique a role retornada pela API `/api/me`.

**Arquivo:** [front/src/lib/auth/AuthContext.tsx](file:///Users/ytower/Code/bolder/gameplate/front/src/lib/auth/AuthContext.tsx)

```diff
   const confirmLogin = useCallback(
     async (data: LoginConfirmData) => {
       const result = await apiConfirmLogin(data);
       const token = await apiRefreshToken();
       setAccessToken(token);
       setAccessTokenState(token);
       const userData = await apiMe();
       setUser(userData);
       setIsAuthenticated(true);
       setAuthStatusCookie();
       posthog.identify(userData.id);
-      router.push(result.redirectTo);
+      // Redireciona com base na role em vez do padrão do backend
+      const destination = userData.role === "institution" || userData.role === "admin" 
+        ? "/institution" 
+        : "/";
+      router.push(destination);
     },
     [router],
   );
```

*(Faça o mesmo ajuste na função `confirmVerifyEmail` na linha ~147 do mesmo arquivo, se desejar que a verificação de e-mail inicial também redirecione corretamente).*

```diff
   const confirmVerifyEmail = useCallback(
     async (data: VerifyEmailConfirmData) => {
       const result = await apiConfirmVerifyEmail(data);
       const token = await apiRefreshToken();
       setAccessToken(token);
       setAccessTokenState(token);
       const userData = await apiMe();
       setUser(userData);
       setIsAuthenticated(true);
       setAuthStatusCookie();
       posthog.identify(userData.id);
-      router.push(result.redirectTo);
+      // Redireciona com base na role em vez do padrão do backend
+      const destination = userData.role === "institution" || userData.role === "admin" 
+        ? "/institution" 
+        : "/";
+      router.push(destination);
     },
     [router],
   );
```

---

## 🔍 Validação e Testes
Depois de aplicar as alterações, você pode testar da seguinte maneira:
1. Tente logar com o seu e-mail de **institution**. Você deverá ver o terminal mock imprimir o link, e após clicar em "Confirmar acesso" na web, você deverá ser levado **direto para `/institution`** sem ver a tela do Phaser.
2. Se tentar acessar manualmente a URL principal `http://localhost:3000/` enquanto estiver logado como instituição, o `PlayerGuard` agirá instantaneamente e te mandará de volta para `http://localhost:3000/institution`.
3. Tente logar com um e-mail de **player** normal. O comportamento clássico de carregar o jogo Phaser deve continuar funcionando 100%.
