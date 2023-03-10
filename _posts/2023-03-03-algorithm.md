---
title: 비트마스킹, 비트연산자
date: 2023-03-03
categories: [Algorithm, Fundamental]
tags : [AIFFEL, Algorithm, Python]
toc: True
comments: True
# math: True
# mermaid: True 

# pin:True # 포스트를 상단에 pin
# how to upload image : ![Desktop View](/assets/img/sample/mockup.png){: width="700" height="400" }{: .left }

---



# 비트 마스크



컴퓨터의 최소 연산 단위인 bit를 연산하여 문제를 빠르게 해결할 수 있습니다.

```python
list = [False] * 10
```
{: .nolineno }

와 같은 표현을 비트마스킹으로

```python
bit = 0b0000000000
```
{: .nolineno }

로 표현할 수 있습니다.



# 비트 연산


비트간의 연산으로 AND(&), OR(|), XOR(^), NOT(~) 이 있습니다.



## 1. AND 연산 (&)

1.  대응하는 숫자가 모두 1이면 1
2. **011001** & **010011** # **010001** 



## 2. OR 연산(|)

1. 대응하는 숫자가 한개라도 1이면 1
2. **011001** & **010011** =  **#011011**



## 3. XOR 연산(^)

1. 대응하는 숫자가 서로 다르면 1 반환
2. **011001** & **010011** =  **#001010**



## 4. NOT 연산(~)

1. 값을 반대로 전환
2. **~011001**  = **#100110** 



## 5. 왼쪽 이동 ( a << b )

1.  a를 b비트 만큼 왼쪽 이동
2.  a = 1일때 a<<4 은 **#000001** 이 **#010000** 되는 것



## 6. 왼쪽 이동 ( a >> b )

1.  a를 b비트 만큼 오른쪽 이동
2.  a = 1일때 a>>4 은 **#100000** 이 **#000001** 되는 것



# 활용 연산



## 1. 원소 추가 ( A | B)

* n = 4

* **#100000** | **( 1 << n )**

* **#100000** | **#010000** = **#110000**

n 번째 비트에 원소 추가



## 2. 원소 삭제 (A & ~B)

* n = 4
* **#110011** & **~( 1 << n )**
* **#110011** & **~#010000**
* **#110011** & **#101111** = **#100011**

n 번째 비트에 원소 제거



## 3. 원소 조회

* n = 4
* **#110011** & **( 1 << n )**
* **#110011** & **#010000** = **#010000**

이때 리턴값이 0이면 없다는 뜻이 된다.

n 번째 원소에 원소가 있는지 없는지



## 4. 원소 역전

* n = 3

* **#110011 ^ ( 1 << n )**
* **#110011 ^ #001000** = **#111011**

n=3 번째 자리에서 1이면 0, 0이면 1이 되도록 한다.



