<template>
  <div id="app">
    <nav class="main-navbar">
      <div class="nav-brand">
        <span class="emoji">🏆</span>
        <span class="brand-name">Liga Pokémon</span>
      </div>
      <div class="nav-links">
        <router-link to="/battles" class="nav-link" active-class="active-link">Combates</router-link>
        <router-link to="/pokemons" class="nav-link" active-class="active-link">Pokemones</router-link>
        <router-link to="/scenarios" class="nav-link" active-class="active-link">Escenarios</router-link>
      </div>
      <!-- <div class="nav-status">
        <span class="status-dot"></span> Conectado
      </div> -->
    </nav>
    <main>
      <router-view/>
    </main>
  </div>
</template>

<style>
.main-navbar {
  background: linear-gradient(90deg, #0d7266 60%, #1c4b77 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7em 2em 0.7em 1.5em;
  border-bottom: 1.5px solid #e1eede;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: .51em;
}
.emoji {
  font-size: 1.4em;
}
.brand-name {
  font-weight: 700;
  font-size: 1.17em;
  color: #fff;
}
.nav-links {
  display: flex;
  gap: 1em;
}
.nav-link {
  color: #fff;
  background: rgba(255,255,255,0.05);
  border: none;
  border-radius: 1.6em;
  padding: 0.47em 1.25em;
  font-size: 1em;
  text-decoration: none;
  font-weight: 500;
  transition: background .16s, color .15s;
}
.nav-link.active-link {
  background: #fff;
  color: #129689;
}
.nav-link:hover {
  background: #ffe780;
  color: #1c4b77;
}
.nav-status {
  color: #bbffe3;
  font-size: .98em;
  display: flex;
  align-items: center;
  gap: 0.45em;
}
.status-dot {
  display: inline-block;
  width: .7em;
  height: .7em;
  background: #00e676;
  border-radius: 50%;
  margin-right: .18em;
}
</style>
