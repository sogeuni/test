---
layout: page
title:  해시 테이블
date:   2017-05-30 01:08:00 +0800
---

* content
{:toc}

<!-- # 해시 테이블 (Hash tables) -->

## 해시 테이블의 개념

지금까지는 삽입한 순서대로 저장되는 컨테이너를 다뤘습니다만, 지금부터 설명할 컨테이너는  "map", "associative array" 또는 "dictionary"라고 불리는 *해시 테이블* 입니다.

사전이 단어와 정의가 연결되어 있는 것처럼, 해시 테이블은 유일한 *value*를 가리키는 *key*를 사용합니다. 해시 테이블은 key에 대한 삽입, 검색 및 삭제 동작을 매우 빠르게 수행할 수 있습니다; 적절히 사용한다면 이러한 동작 모두 동일한 시간 -- 즉, O(1) -- 이 걸립니다. 따라서, 검색 및 삭제에 O(n)이 걸리는 ordered list 보다 훨씬 좋습니다.

해시 테이블은 *해시 함수(hash function)*을 사용하여 key를 찾기 때문에 동작을 빠르게 수행합니다. 해시 함수는 key를 이용하여 *해시(hash)*라 불리는 유일한 값을 계산합니다. 예를 들어, 해시 함수는 단어를 받아들여 단어의 문자수를 해시로 리턴할 수 있습니다. 하지만 이것은 나쁜 해시 함수 입니다. "fiddle"과 "faddle" 모두 같은 해시값을 가지기 때문입니다.

두개의 다른 키에 대해 해시 함수가 같은 해시를 리턴한다면, 해시 테이블의 구현에 따라 다양한 일들이 발생합니다. 해시 테이블은 두번째 값을 첫번째 값에 덮어 쓸 수도 있고, 값들을 리스트로 관리하기도 하며, 아니면 단순히 에러를 낼 수도 있습니다.

해시 테이블이 리스트보다 반드시 빠르지만은 않습니다. 작은 수의 아이템 경우 (수십개 미만) 순서가 지정된 컬렉션이 더 나은 성능을 낼 수도 있습니다. 해시 테이블에서 데이터를 저장하고 조회할 때는 해시를 계산하기 위해 거의 일정한 시간이 소요되는데 이 시간이 포인터를 참조하는 시간보다 느릴 수 있기 때문입니다. 적은 값들에 대해서는 순서를 가지는 컨테이너를 단순 반복하여 검색하는 것이 해시 계산보다 빠를 수 있습니다.

항상 그렇듯 어플리케이션이 필요로 하는 적절한 컨테이너를 선택하는 것이 중요합니다. 또한, 어플리케이션이 필요로 하는 것이 명확해지면 언제라도 컨테이너는 변경할 수 있습니다. 

## 해시 테이블의 몇가지 기본 동작

위에서 설명한 해시 테이블에 대한 몇가지 예가 있습니다.

```c
//ex-ghashtable-1.c
#include <glib.h>

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new(g_str_hash, g_str_equal);
  g_hash_table_insert(hash, "Virginia", "Richmond");
  g_hash_table_insert(hash, "Texas", "Austin");
  g_hash_table_insert(hash, "Ohio", "Columbus");
  
  printf("There are %d keys in the hash\n", g_hash_table_size(hash));
  printf("The capital of Texas is %s\n", g_hash_table_lookup(hash, "Texas"));
  gboolean found = g_hash_table_remove(hash, "Virginia");
  printf("The value 'Virginia' was %sfound and removed\n", found ? "" : "not ");
  
  g_hash_table_destroy(hash);
  return 0;
}
 
***** 결과 *****
 
There are 3 keys in the hash
The capital of Texas is Austin
The value 'Virginia' was found and removed
```

코드에 대한 부가 설명:

* `g_hash_table_new` 를 호출하면서 string을 키로 사용하는 것으로 지정합니다. `g_str_hash`와 `g_str_equal` 함수는 일반적은 use case이므로 GLib에 내장되어 있습니다. 다른 내장 hash/equality 함수는 `g_int_hash`/`g_int_equal`의 경우 integer를 `g_direct_hash`/`g_direct_equal`의 경우 포인터를 키로 사용합니다.
* GLists 와 GSLists는 자신을 삭제하기 위해 `g_[container]_free` 함수를 사용합니다; GHashTable은 `g_hash_table_destroy`로 해시테이블을 삭제합니다.
* key/value 쌍을 삭제하기 위해 `g_hash_table_remove`를 호출하면 `gboolean`을 리턴합니다.(키를 찾고 삭제한 경우 true) `gboolean`은 true/false 값의 간단한 크로스-플랫폼 GLib 구현입니다.
* `g_hash_table_size`는 해시 테이블내의 키의 갯수를 리턴합니다. 

## 값의 삽입(insert)과 변경(replace)

`g_hash_table_insert`를 사용하여 키를 삽입하면 GHashTable은 먼저 키가 중복되는지를 체크합니다. 만약 중복된 키가 있다면 키는 변경없이 값만 변경합니다. 키와 값 둘다 변경하고자 한다면 `g_hash_table_replace`를 사용합니다. 둘은 미묘한 차이점이 있으며 아래 코드에서 설명합니다.

```c
//ex-ghashtable-2.c
#include <glib.h>

static char* texas_1, *texas_2;

void key_destroyed(gpointer data) {
 printf("Got a key destroy call for %s\n", data == texas_1 ? "texas_1" : "texas_2");
}

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new_full(g_str_hash, g_str_equal, (GDestroyNotify)key_destroyed, NULL);
  texas_1 = g_strdup("Texas");
  texas_2 = g_strdup("Texas");
  
  g_hash_table_insert(hash, texas_1, "Austin");
  
  printf("Calling insert with the texas_2 key\n");
  g_hash_table_insert(hash, texas_2, "Houston");
  
  printf("Calling replace with the texas_2 key\n");
  g_hash_table_replace(hash, texas_2, "Houston");

  printf("Destroying hash, so goodbye texas_2\n");  
  g_hash_table_destroy(hash);
  g_free(texas_1);
  g_free(texas_2);
  return 0;
}
 
***** 결과 *****
 
Calling insert with the texas_2 key
Got a key destroy call for texas_2
Calling replace with the texas_2 key
Got a key destroy call for texas_1
Destroying hash, so goodbye texas_2
Got a key destroy call for texas_2
```

결과를 보면 `g_hash_table_insert`로 존재하는 키에 동일한 문자열(`Texas`)을 삽입할 때, GHashTable은 전달된 키(`texas_2`)를 무시하고 기존 키(`texas_1`)에 값을 저장합니다. 하지만 `g_hash_table_replace`의 경우 `texas_1` 키는 삭제되고 `texas_2` 키가 사용됩니다. 다음은 몇가지 참고사항입니다:

* 새로운 GHashTable을 생성할 때 `g_hash_table_full`을 이용하여 키 삭제시 호출될 GDestroyNotify를 구현할 수 있습니다. 이렇게 하면 해당 키에 대해서 모든 리소스를 정리할 수 있으며, 위의 예제처럼 키변경시 어떤 일이 일어나는지 확인할 수도 있습니다.
* GSList 섹션에서 `g_strdup`을 보았습니다; 여기서는 문자열 Texas의 두개의 사본을 할당하는데 사용되었습니다. GHashTable 함수인 `g_str_hash`와 `g_str_equal`은 각 변수가 다른 메모리 위치에 대한 포인터지만, 실제 문자열은 동일하다는 것을 올바르게 감지했음을 알 수 있습니다.

## 키/값 쌍의 반복(iterating)

모든 키/값 쌍의 반복이 필요할 수도 있습니다. 이 경우 `g_hash_table_foreach`를 사용합니다.

```c
//ex-ghashtable-3.c
#include <glib.h>

void iterator(gpointer key, gpointer value, gpointer user_data) {
  printf(user_data, *(gint*)key, value);
}

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new(g_int_hash, g_int_equal);
  gint* k_one = g_new(gint, 1), *k_two = g_new(gint, 1), *k_three = g_new(gint, 1);
  *k_one = 1, *k_two=2, *k_three = 3;
  g_hash_table_insert(hash, k_one, "one");
  g_hash_table_insert(hash, k_two, "four");
  g_hash_table_insert(hash, k_three, "nine");
  
  g_hash_table_foreach(hash, (GHFunc)iterator, "The square of %d is %s\n");
  
  g_hash_table_destroy(hash);
  return 0;
}
 
***** 결과 *****
 
The square of 1 is one
The square of 2 is four
The square of 3 is nine
```

* GLib에서 제공하는 해싱 함수인 `g_int_hash`와 `g_int_equal`을 사용하면 정수로를 가리키는 포인터를 키로 사용할 수 있습니다. 그리고 이 예제는 정수에 대한 GLib 크로스 플랫폼 추상화인 gint를 사용합니다.
* `g_hash_table_foreach`는 이전에 보았던 `g_slist_foreach`, `g_list_foreach` 함수와 매우 유사합니다. 다른 점이라면 `g_hash_table_foreach`를 통해 전달되는 GHFunc의 인자가 2개가 아닌 3개라는 점입니다. 이 경우 3번째 인자로 출력할 포맷을 전달합니다. 또한, 이 예제에서는 키가 삽입된 순서대로 출력되었지만, 키의 삽입순서가 유지된다고 보장할 수는 없습니다.

## 아이템 찾기

특정 값을 찾으려면 `g_hash_table_find` 함수를 사용합니다. 이 함수는 원하는 키/값 쌍을 찾을 때까지 각 키/값 쌍을 볼 수 있습니다.

```c
//ex-ghashtable-4.c
#include <glib.h>

void value_destroyed(gpointer data) {
   printf("Got a value destroy call for %d\n", GPOINTER_TO_INT(data));
}

gboolean finder(gpointer key, gpointer value, gpointer user_data) {
  return (GPOINTER_TO_INT(key) + GPOINTER_TO_INT(value)) == 42;
}

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new_full(g_direct_hash, g_direct_equal,
    NULL,
    (GDestroyNotify)value_destroyed);
    
  g_hash_table_insert(hash, GINT_TO_POINTER(6), GINT_TO_POINTER(36));
  g_hash_table_insert(hash, GINT_TO_POINTER(10), GINT_TO_POINTER(12));
  g_hash_table_insert(hash, GINT_TO_POINTER(20), GINT_TO_POINTER(22));
 
  gpointer item_ptr = g_hash_table_find(hash, (GHRFunc)finder, NULL);
  gint item = GPOINTER_TO_INT(item_ptr);
  printf("%d + %d == 42\n", item, 42-item);
 
  g_hash_table_destroy(hash);
  return 0;
}
 
***** 결과 *****
 
36 + 6 == 42
Got a value destroy call for 36
Got a value destroy call for 22
Got a value destroy call for 12
```

코드에 대한 간략한 설명입니다.

* `g_hash_table_find`는 GHRFunc이 TRUE를 리턴하는 첫 번째 값을 리턴합니다. GHRFunc가 모든 아이템에 대해 TRUE를 리턴하지 않는다면(찾고자 하는 아이템을 발견할 수 없는 경우) find 함수는 NULL을 리턴합니다.
* 이 예제는 `g_direct_hash`와 `g_direct_equal`이라는 또다른 GLib 내장 해시함수를 보여줍니다. 이 함수 셋은 키로 포인터를 사용하지만, 포인터가 가리키는 값을 해석하지 않습니다.  그리고 GHashTable에는 포인터를 넣어야 하기 때문에, GLib 매크로(`GINT_TO_POINTER` 와 `GPOINTER_TO_INT`)를 사용하여 정수와 포인터 간의 전환이 필요합니다.
* 마지막으로 이 예제는 GHashTable을 생성할 때 `GDestroyNotify` 콜백을 넘겨주어 아이템이 삭제될 때 확인할 수 있게 하였습니다.  대부분의 경우에는 이러한 콜백에서 메모리를 free하지만 예제기 때문에 출력하도록 구현하였습니다.

## 교활한(?) 작업: 테이블에서 값 훔치기(steal)

경우에 따라 GHashTable에 주어진 `GDestroyNotify` 함수를 콜백하지 않고 GHashTable에서 항목을 제거해야 할 수도 있습니다. `g_hash_table_steal`를 사용하여 특정키에 대한 값을 삭제하거나 `g_hash_table_foreach_steal`을 사용하여 조건에 일치하는 모든 키에 대해 값을 삭제할 수 있습니다.

```c
//ex-ghashtable-5.c
#include <glib.h>

gboolean wide_open(gpointer key, gpointer value, gpointer user_data) {
  return TRUE;
}

void key_destroyed(gpointer data) {
  printf("Got a GDestroyNotify callback\n");
}

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new_full(g_str_hash, g_str_equal,
    (GDestroyNotify)key_destroyed,
    (GDestroyNotify)key_destroyed);
  g_hash_table_insert(hash, "Texas", "Austin");
  g_hash_table_insert(hash, "Virginia", "Richmond");
  g_hash_table_insert(hash, "Ohio", "Columbus");
  g_hash_table_insert(hash, "Oregon", "Salem");
  g_hash_table_insert(hash, "New York", "Albany");
 
  printf("Removing New York, you should see two callbacks\n");
  g_hash_table_remove(hash, "New York");
  if (g_hash_table_steal(hash, "Texas")) {
    printf("Texas has been stolen, %d items remaining\n", g_hash_table_size(hash));
  }
  
  printf("Stealing remaining items\n");
  g_hash_table_foreach_steal(hash, (GHRFunc)wide_open, NULL);
  printf("Destroying the GHashTable, but it's empty, so no callbacks\n");
  
  g_hash_table_destroy(hash);
  return 0;
}
 
***** 결과 *****
 
Removing New York, you should see two callbacks
Got a GDestroyNotify callback
Got a GDestroyNotify callback
Texas has been stolen, 3 items remaining
Stealing remaining items
Destroying the GHashTable, but it's empty, so no callbacks
```

## 고급 검색: 키와 값을 함께 찾기

GHashTable은 테이블에서 키와 값을 모두 가져올 수 있도록 `g_hash_table_lookup_extended` 함수를 제공합니다. 이것은 `g_hash_table_lookup`과 비슷하지만, 인자를 두 개 더 받습니다. 이것들은 데이터를 가리키는 이중포인터인 "출력" 인자입니다. 동작 방식은 다음과 같습니다:

```c
//ex-ghashtable-6.c
#include <glib.h>

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new(g_str_hash, g_str_equal);
  
  g_hash_table_insert(hash, "Texas", "Austin");
  g_hash_table_insert(hash, "Virginia", "Richmond");
  g_hash_table_insert(hash, "Ohio", "Columbus");
 
  char* state = NULL;
  char* capital = NULL;
  char** key_ptr = &state;
  char** value_ptr = &capital;
  
  gboolean result = g_hash_table_lookup_extended(hash, "Ohio", 
    (gpointer*)key_ptr, (gpointer*)value_ptr);
  
  if (result) {
    printf("Found that the capital of %s is %s\n", capital, state);
  }
  
  if (!g_hash_table_lookup_extended(hash, "Vermont", 
    (gpointer*)key_ptr, (gpointer*)value_ptr)) {
    printf("Couldn't find Vermont in the hash table\n");
  }
  
  g_hash_table_destroy(hash);
  return 0;
}
 
***** 결과 *****
 
Found that the capital of Columbus is Ohio
Couldn't find Vermont in the hash table
```

키/값 데이터를 받을 변수를 초기화하는 코드는 약간 복잡하지만, 이 함수에서 하나 이상의 값을 반환하는 방법이라 생각하면 이해하기 더 수월할 것입니다. 마지막 두 개의 인자중 하나에 NULL을 넘기면 `g_hash_table_lookup_extended`의 동작은 계속되지만 NULL 인자에 값을 넣지는 않습니다.

## 하나의 키에 대해 여러값 넣기

지금까지는 하나의 키에 대해 하나의 값만 가지는 해시를 보았습니다만 때때로 하나의 키에 대해 여러개의 값을 저장할 필요가 있습니다. 이 경우 키에 대한 값으로 GSList를 사용하고 GSList에 새로운 값을 추가하는 방법이 좋은 해결책입니다. 조금 더 복잡하지만 다음 예제와 같이 사용할 수 있습니다:

```c
//ex-ghashtable-7.c
#include <glib.h>

void print(gpointer key, gpointer value, gpointer data) {
  printf("Here are some cities in %s: ", key);
  g_slist_foreach((GSList*)value, (GFunc)printf, NULL);
  printf("\n");
}

void destroy(gpointer key, gpointer value, gpointer data) {
  printf("Freeing a GSList, first item is %s\n", ((GSList*)value)->data);
  g_slist_free(value);
}

int main(int argc, char** argv) {
  GHashTable* hash = g_hash_table_new(g_str_hash, g_str_equal);
  
  g_hash_table_insert(hash, "Texas",
    g_slist_append(g_hash_table_lookup(hash, "Texas"), "Austin "));
  g_hash_table_insert(hash, "Texas",
    g_slist_append(g_hash_table_lookup(hash, "Texas"), "Houston "));
  g_hash_table_insert(hash, "Virginia",
    g_slist_append(g_hash_table_lookup(hash, "Virginia"), "Richmond "));
  g_hash_table_insert(hash, "Virginia",
    g_slist_append(g_hash_table_lookup(hash, "Virginia"), "Keysville "));
    
  g_hash_table_foreach(hash, print, NULL);
  g_hash_table_foreach(hash, destroy, NULL);
  
  g_hash_table_destroy(hash);
  return 0;
}
 
***** 결과 *****
 
Here are some cities in Texas: Austin Houston
Here are some cities in Virginia: Richmond Keysville
Freeing a GSList, first item is Austin
Freeing a GSList, first item is Richmond
```

위의 예제에서 "새로운 도시를 추가"하는 코드는 GSList의 `g_slist_append` 함수가 NULL을 유효한 인자로 받아들인다는 장점을 이용합니다. 따라서, 도시를 추가할 때 주어진 주(key)의 첫번째 도시인지 확인할 필요가 없습니다.

GHashTable을 없애기 전에 테이블 내의 모든 GSList를 해제해야 합니다. static 문자열을 사용하지 않으면 좀 더 복잡할 수 있습니다. 이 경우엔 리스트를 해제하기 전에 각 문자열을 먼저 해제할 필요가 있습니다. 이 예제에서 우리는 다양한 `foreach` 함수가 얼마나 유용하게 쓰이는지 알 수 있습니다. 

## 해시 테이블의 실 사용례

GHashTable이 실제로 사용되는 예제들입니다.

Gaim 에서,

* `gaim-1.2.1/src/buddyicon.c` 에서 "buddy icons"의 추적을 위해 GHashTable을 사용합니다. 여기서 키는 buddy의 사용자 이름이며 값은 `GaimBuddyIcon` 구조체입니다.
* `gaim-1.2.1/src/protocols/yahoo/yahoo.c`은 `g_hash_table_steal`을 사용합니다. 버디 목록을 매핑하기 위해 계정 이름을 만드는 코드에서 사용됩니다.

Evolution 에서,

* `evolution-2.0.2/smime/gui/certificate-manager.c` 에서 S/MIME 인증서 루트를 추적하는데 GHashTable을 사용합니다. 키는 organization 이름이며 값은 GtkTreeIter의 포인터입니다.
* `evolution-data-server-1.0.2/calendar/libecal/e-cal.c` 에서 타임존을 추적하는데 GHashTable이 사용합니다. 키는 타임존 ID 문자열이며, 값은 `icaltimezone` 구조체의 문자열 표현입니다.

Gimp 에서,

* `gimp-2.2.4/libgimp/gimp.c` 에서 GHashTable을 사용하여 임시 프로시저를 관리합니다. `g_hash_table_lookup_extended` 호출하여 프로시저를 찾고, 해시 키를 메모리에서 해제하기 전에 프로시저를 삭제합니다.
* `gimp-2.2.4/app/core/gimp.c` 에서 이미지를 저장하는데 GHashTable을 사용합니다. 키는 이미지 ID(integer)이며 값은 `GimpImage` 구조체의 포인터입니다.