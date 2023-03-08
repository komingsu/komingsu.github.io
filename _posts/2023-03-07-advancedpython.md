---
title: 내가 보려고 만든, 중급 python 기능
date: 2023-03-07
categories: [Python]
tags : [Python]
toc: True
---





파이썬을 쓰면서 기본 기능들 중에서 유용하지만 익숙지않아 잘 사용하지 않은 기능들을 이해하기 위해 정리합니다.



# 1. 예외



## 예외 처리

보통 `try ... except` 문은 자주 쓰지만 `else` 와 `finally` 는 거의 쓰지 않고 있습니다.

```python
try:
    실행할 코드
except:
    예외가 발생했을 때 처리하는 코드
else:
    예외가 발생하지 않았을 때 실행할 코드
finally:
    예외 발생 여부와 상관없이 항상 실행할 코드
```

* 예시

```
try:
    x = int(input('나눌 숫자를 입력하세요: '))
    y = 10 / x
except ZeroDivisionError:    # 숫자를 0으로 나눠서 에러가 발생했을 때 실행됨
    print('숫자를 0으로 나눌 수 없습니다.')
else:                        # try의 코드에서 예외가 발생하지 않았을 때 실행됨
    print(y)
finally:                     # 예외 발생 여부와 상관없이 항상 실행됨
    print('코드 실행이 끝났습니다.')
```



## 예외 발생

의도적으로 예외를 발생시키려 할 때



### raise

```python
def three_multiple():
    x = int(input('3의 배수를 입력하세요: '))
    if x % 3 != 0:                                 # x가 3의 배수가 아니면
        raise Exception('3의 배수가 아닙니다.')    # 예외를 발생시킴
    print(x)                                       # 현재 함수 안에는 except가 없으므로
                                                   # 예외를 상위 코드 블록으로 넘김
try:
    three_multiple()
except Exception as e:                             # 하위 코드 블록에서 예외가 발생해도 실행됨
    print('예외가 발생했습니다.', e)
```

```output
	>>> 3의 배수를 입력하세요: 5 (입력)
	예외가 발생했습니다. 3의 배수가 아닙니다.
```





### assert

```python
x = int(input('3의 배수를 입력하세요: '))
assert x % 3 == 0, '3의 배수가 아닙니다.'    # 3의 배수가 아니면 예외 발생, 3의 배수이면 그냥 넘어감
print(x)
```

```output
	>>> 3의 배수를 입력하세요: 5 (입력)
	Traceback (most recent call last):
    	File "C:\project\assertion.py", line 2, in <module>
        	assert x % 3 == 0, '3의 배수가 아닙니다.'
		AssertionError: 3의 배수가 아닙니다.
```







# 2. 클래스



## @staticmethod

클래스에서 객체를 만들어 메서드를 호출하는 것이 아닌 클래스에서 바로 메서드를 부를 때 사용합니다.

```python
class Calc:
    @staticmethod
    def add(a, b):
        print(a + b)
 
    @staticmethod
    def mul(a, b):
        print(a * b)
 
Calc.add(10, 20)    # 클래스에서 바로 메서드 호출
Calc.mul(10, 20)    # 클래스에서 바로 메서드 호출
```

```output
	30
	200
```



## @abstractmethod 

**추상 클래스(abstract class)**는 메서드 목록만 가진 클래스입니다. ( 상속 전용 )

추상 클래스는 사용할 때 `abc` 라이브러리를 가져와야 합니다. 또한 추상클래스에서 메서드로 지정해둔 것은 상속받은 클래스에서 구현을 강제합니다.

```python
from abc import *
 
class StudentBase(metaclass=ABCMeta):
    @abstractmethod
    def study(self):
        pass
 
    @abstractmethod
    def go_to_school(self):
        pass
 
class Student(StudentBase):
    def study(self):
        print('공부하기')
 
	def go_to_school(self): # 반드시 구현은 해야함
        pass 
    
james = Student()
james.study()
```



# 3. 이터레이터

커스텀 iterator 를 만들어봅시다.

```python
class Counter:
    def __init__(self, stop):
        self.current = 0    # 현재 숫자 유지, 0부터 지정된 숫자 직전까지 반복
        self.stop = stop    # 반복을 끝낼 숫자
 
    def __iter__(self):
        return self         # 현재 인스턴스를 반환
 
    def __next__(self):
        if self.current < self.stop:    # 현재 숫자가 반복을 끝낼 숫자보다 작을 때
            r = self.current            # 반환할 숫자를 변수에 저장
            self.current += 1           # 현재 숫자를 1 증가시킴
            return r                    # 숫자를 반환
        else:                           # 현재 숫자가 반복을 끝낼 숫자보다 크거나 같을 때
            raise StopIteration         # 예외 발생
 
for i in Counter(3):
    print(i, end=' ')
```

```output
	0 1 2
```



언패킹도 가능합니다.

```python
a, b, c, d, e = Counter(5)
print(a, b, c, d, e)
```

```output
	0 1 2 3 4
```





인데스에 접근할 수 있는 이터레이터는 `__next__` 가 아닌 `__getitem__` 로 접근합니다.

```python
class Counter:
    def __init__(self, stop):
        self.stop = stop             # 반복을 끝낼 숫자
 
    def __getitem__(self, index):    # 인덱스를 받음
        if index < self.stop:        # 인덱스가 반복을 끝낼 숫자보다 작을 때
            return index             # 인덱스를 반환
        else:                        # 인덱스가 반복을 끝낼 숫자보다 크거나 같을 때
            raise IndexError         # 예외 발생
 
print(Counter(3)[0], Counter(3)[1], Counter(3)[2])
 
for i in Counter(3):
    print(i, end=' ')
```

```output
	0 1 2
	0 1 2
```



# 4. 제너레이터

Generator 와 yield 는 아주 유용하게 사용할 수 있을것 같습니다.

return 처럼 현재 값을 메서드 밖으로 보내지만 yield는 메서드가 끝나지 않습니다.

```python
def number_generator(stop):
    n = 0              # 숫자는 0부터 시작
    while n < stop:    # 현재 숫자가 반복을 끝낼 숫자보다 작을 때 반복
        yield n        # 현재 숫자를 바깥으로 전달
        n += 1         # 현재 숫자를 증가시킴
 
for i in number_generator(3):
    print(i)
```

```output
	0
	1
	2
```



또한 제너레이터의 yield from 을 통해 반복문 없이 값을 꺼낼 수 있습니다.
```python
def number_generator():
    x = [1, 2, 3]
    yield from x    # 리스트에 들어있는 요소를 한 개씩 바깥으로 전달
 
for i in number_generator():
    print(i)
```

```output
	1
	2
	3
```



그리고 yield from 에 또 다른 제너레이터를 넣을 수도 있습니다.

```python
def number_generator(stop):
    n = 0
    while n < stop:
        yield n
        n += 1
 
def three_generator():
    yield from number_generator(3)    # 숫자를 세 번 바깥으로 전달
 
for i in three_generator():
    print(i)
```

```output
	0
	1
	2
```



마지막으로 [ ] 와 for 반복문으로 리스트를 만들 수 있었습니다. 이때 괄호를 ( ) 를 사용하면 제너레이터가 되게 됩니다.

```output
>>> [i for i in range(50) if i % 2 == 0]
[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]
```

```output
>>> (i for i in range(50) if i % 2 == 0)
<generator object <genexpr> at 0x024F02A0>
```



# 5. 코루틴

이번에는 yield를 값을 밖으로 내보내는 용이 아닌 yield값을 읽어오는 **coroutine(cooperative routine)** 입니다.

코루틴은 메인 루틴과 합을 맞출 수 있는 협력 루틴입니다. 코루틴은 종속 관계가 아니며 특정 시점에 상대방의 코드를 실행 시켜 랠리가 가능해 집니다.

이때 코루틴으로 값을 보낼 때는 `.send(값)` 으로 보내고, 값을 받는 것은 `(yield)` 로 받습니다.

```python
def number_coroutine():
    while True:        # 코루틴을 계속 유지하기 위해 무한 루프 사용
        x = (yield)    # 코루틴 바깥에서 값을 받아옴, yield를 괄호로 묶어야 함
        print(x)
 
co = number_coroutine() # 코루틴 객체 생성
next(co)      # 코루틴 안의 yield까지 코드 실행(최초 실행)
# 이때 co.send(None) 으로도 최초실행이 가능함
 
co.send(1)    # 코루틴에 숫자 1을 보냄
co.send(2)    # 코루틴에 숫자 2을 보냄
co.send(3)    # 코루틴에 숫자 3을 보냄
```

```output
	1
	2
	3
```



그리고 코루틴 안에 있는 값을 밖으로 내보낼 때는 `(yield 변수명)` 처럼 ( )괄호로 변수를 yield와 함께 감싸 내보냅니다.

```python
def sum_coroutine():
    total = 0
    while True:
        x = (yield total)    # 코루틴 바깥에서 값을 받아오면서 바깥으로 값을 전달
        total += x
 
co = sum_coroutine()
print(next(co))      # 0: 코루틴 안의 yield까지 코드를 실행하고 코루틴에서 나온 값 출력
 
print(co.send(1))    # 1: 코루틴에 숫자 1을 보내고 코루틴에서 나온 값 출력
print(co.send(2))    # 3: 코루틴에 숫자 2를 보내고 코루틴에서 나온 값 출력
print(co.send(3))    # 6: 코루틴에 숫자 3을 보내고 코루틴에서 나온 값 출력
```

```output
	0
	1
	3
	6
```



다음으로 코루틴 끝내기를 보겠습니다.

코루틴은 `while True:` 로 무한 루프로 작동합니다. 이걸 끄기 위해서는 `.close()` 로 코루틴을 강제종료 해야합니다. 하지만 기본 스크립트가 끝나면 코루틴 또한 자동 종료되므로 반드시 꺼야할 필요는 없습니다. 하지만 코루틴을 종료하면 `GeneratorExit`을 발생합니다.

```python
def number_coroutine():
    try:
        while True:
            x = (yield)
            print(x, end=' ')
    except GeneratorExit:    # 코루틴이 종료 될 때 GeneratorExit 예외 발생
        print()
        print('코루틴 종료')
 
co = number_coroutine()
next(co)
 
for i in range(20):
    co.send(i)
 
co.close()
```

```output
	0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 
	코루틴 종료
```



마지막으로 코루틴의 `yield from`을 확인하겠습니다.

```python
def accumulate():
    total = 0
    while True:
        x = (yield)         # 코루틴 바깥에서 값을 받아옴
        if x is None:       # 받아온 값이 None이면
            return total    # 합계 total을 반환
        total += x
 
def sum_coroutine():
    while True:
        total = yield from accumulate()    # accumulate의 반환값을 가져옴
        print(total)
 
co = sum_coroutine()
next(co)
 
for i in range(1, 11):    # 1부터 10까지 반복
    co.send(i)            # 코루틴 accumulate에 숫자를 보냄
co.send(None)             # 코루틴 accumulate에 None을 보내서 숫자 누적을 끝냄
 
for i in range(1, 101):   # 1부터 100까지 반복
    co.send(i)            # 코루틴 accumulate에 숫자를 보냄
co.send(None)             # 코루틴 accumulate에 None을 보내서 숫자 누적을 끝냄
```

```output
55
5050
```



# 6. 데코레이터

항상 python 을 배울 때 가장 마지막에 나와 잠깐 이해하고 오래 잊어먹는 부분으로 데코레이터는 `@method` 를 말합니다.

예시로 timer라는 데코레이터를 만들어보겠습니다.

이때 functools 의 wraps 데코레이터를 wrapper에 적용하면 signiture와 docstring을 보존하여 협업과 안정성에 도움을 줍니다.

```python
from functools import wraps
import time

def timeit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        total_time = end_time - start_time
        # first item in the args, ie `args[0]` is `self`
        print(f'Function {func.__name__}{args} {kwargs} Took {total_time:.4f} seconds')
        return result
    return wrapper

# 의미없는 함수인건 알지만 데코레이터 적용을 위해 
@timer
def total(iterable):
    """배열의 합을 계산합니다"""
    return sum(iterable)

if __name__ == '__main__':
	numbers = range(0, int(1e8)) # 1e8 은 1 * 10^8 == 1억 이라는 의미입니다
	total(numbers) # 실행 완료! 1.79초 걸림
```



# 7. 멀티프로세싱

멀티 프로세싱은 병렬처리로 일렬로 처리되던 데이터를 병렬로 처리할 수 있는 방법입니다. 하지만 병렬처리를 한다고 항상 처리속도가 빠른것은 아닙니다. 오히려 더 늦어지는 경우가 많습니다.

제가 경험하는 더 빠른경우는 셀레니움같은 웹 스크랩핑과 같이 의도적으로 `time.sleep()` 과 같은 매서드로 시간을 늘려야하 하는 상황에서 여러개의 프로세스를 만드는 것이 나을 때 유용합니다.

그렇지만 이럴때는 `multiprocessing` 으로 접근하기보다 `treading`으로 접근하는게 좋을 것 같으니 `multiprocessing`이 언제 쓰면 좋을지는 한 번 더 생각해봐야 할 것 같습니다.

```python
import multiprocessing
import time

num_list = ['p1','p2', 'p3', 'p4']
start = time.time()

def count(name):
    time.sleep(5)
    print("finish:"+name+"\n")
    

if __name__ == '__main__':
    pool = multiprocessing.Pool(processes = 2)
    pool.map(count, num_list)
    pool.close()
    pool.join()

print("time :", time.time() - start)
```



# 8. 타입 힌트

파이썬에서는 변수를 지정할 때 보통 `Type`을 지정하지 않고 작성합니다. 하지만 이러다 보면 몇몇 경우에서 `Type error` 로 문제가 생기는 경우가 있습니다.

이를 예방하기 위해 파이썬 3.5 버전 이후 버전에서는 `Type hint`를 지정할 수 있습니다.

```python
def add(a: int, b: int, c: int) -> int:
    return a+b+c
```

이처럼 input과 return 의 타입을 지정하는 것 뿐만아닌 리스트, 딕셔너리 그리고 그 요소에 타입을 지정할 수도 있습니다.

```python
fruits: list[str] = ["apple", "banana", "watermelon"]

menu: dict[str, float] = {
    "pizza" : 9.99,
    "hamburgar" : 12.29,
    "taco" : 7.99
}
```



또한 `typing` 모듈을 이용하여 타입을 지정하면 더 복잡하고 다양하게 타입을 지정할 수 있습니다.

```python
# Optional : 옵션 지정, 디폴트 값 지정
from typing import Optional

def say_hello(name: Optional[str] = None):
    return f"Hello ${name}!" if name else "Hello minsu!"

# Union : 여러 타입 혼용
from typing import Union

price: list[Union[str, int]] = [
    1, "2", 3, "4", 5
]

# Final : 최종 변수 지정
from typing import Final

PRICE: Final = 999
```

마지막으로  타입힌트는 결국 힌트일 뿐이고 작동하는데 아무런 영향을 주지 않습니다. 그저 타입힌트를 무시하고 진행했을 때 `runtime error`를 보게 될 수 있습니다. 



# 9. 매직 메서드

딥러닝에 필요할 것 같은 메서드 정리입니다.

1. `__len__(self)` : len( self ) 을 실행시 나오는 값입니다.

2. `__getitem__(self, key)` : self[key] 표기법을 사용하여 항목에 액세스할 때의 동작을 정의합니다. 적절한 예외를 발생시키는 것을 추천하고 있습니다.
3. `__setitem__(self, key, value)` : self[nkey] = value 표기법을 사용하여 항목이 할당될 때의 동작을 정의합니다
4. `__iter__(self)` : iter() 반복자에 의해 for i in self 를 반복합니다. 이때 iteration은 자체 객체이고 self를 리턴하는 내용을 추가해야합니다.
5. `__missing__(self, key)` : self[key]가 존재하지 않은데 액세스를 할 때 동작합니다. ( \__missing__(key)가 호출됩니다. )

6. `__call__`(self, *args) : 클래스를 함수처럼 동작할 수 있습니다. object.\__call__ 을 object( )처럼 사용할 수 있습니다.

   \__init__ 과 구분해야합니다. 상태가 자주 바뀌는 객체에 효과적입니다.

   

예시 소스코드 입니다.

```python
class FunctionalList:
    '''A class wrapping a list with some extra functional magic, like head,
    tail, init, last, drop, and take.'''

    def __init__(self, values=None):
        if values is None:
            self.values = []
        else:
            self.values = values

    def __len__(self):
        return len(self.values)

    def __getitem__(self, key):
        # if key is of invalid type or value, the list values will raise the error
        return self.values[key]

    def __setitem__(self, key, value):
        self.values[key] = value

    def __delitem__(self, key):
        del self.values[key]

    def __iter__(self):
        return iter(self.values)

    def __reversed__(self):
        return reversed(self.values)

    def append(self, value):
        self.values.append(value)
        
    def init(self):
        # get elements up to the last
        return self.values[:-1]

    def drop(self, n):
        # get all elements except first n
        # usually use drop == skip
        return self.values[n:]
    def take(self, n):
        # get first n elements
        return self.values[:n]
```
